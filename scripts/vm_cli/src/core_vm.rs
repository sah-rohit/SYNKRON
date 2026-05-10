// Adapted from vm.rs
use crate::vm::compiler::{Constant, CompiledFunction, Instruction};
use crate::vm::jit::JitEngine;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub enum GcValue { String(String) }

pub struct GcObject { pub marked: bool, pub value: GcValue }

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Value { Nil, Boolean(bool), Number(f64), Object(*mut GcObject) }

impl Value {
    pub fn is_falsey(&self) -> bool { match self { Value::Nil => true, Value::Boolean(b) => !b, _ => false } }
    pub fn as_number(&self) -> f64 { match self { Value::Number(n) => *n, _ => 0.0 } }
}

pub struct CallFrame { pub func: *const CompiledFunction, pub ip: usize, pub reg_base: usize }

pub struct VM {
    pub registers: Vec<Value>,
    pub objects: Vec<*mut GcObject>,
    pub frames: Vec<CallFrame>,
    pub functions: Vec<CompiledFunction>,
    pub loop_counters: HashMap<usize, usize>,
    pub logs: Vec<String>,
    jit: Option<JitEngine>,
}

impl VM {
    pub fn new(functions: Vec<CompiledFunction>) -> Self {
        VM {
            registers: vec![Value::Nil; 256],
            objects: Vec::new(),
            frames: Vec::new(),
            functions,
            loop_counters: HashMap::new(),
            logs: Vec::new(),
            jit: JitEngine::new().ok(),
        }
    }
    pub fn alloc_string(&mut self, s: String) -> Value {
        let obj = Box::into_raw(Box::new(GcObject { marked: false, value: GcValue::String(s) }));
        self.objects.push(obj);
        Value::Object(obj)
    }
    pub fn run(&mut self, main_func: &CompiledFunction) -> Value {
        self.frames.push(CallFrame { func: main_func as *const CompiledFunction, ip: 0, reg_base: 0 });
        let mut ret = Value::Nil;
        while !self.frames.is_empty() {
            let frame_idx = self.frames.len() - 1;
            let (mut ip, r_base, f_ptr) = { let f = &self.frames[frame_idx]; (f.ip, f.reg_base, f.func) };
            let func = unsafe { &*f_ptr };
            if ip >= func.instructions.len() { self.frames.pop(); continue; }
            let inst = &func.instructions[ip]; ip += 1;
            match inst {
                Instruction::LoadConst { dest, const_idx } => {
                    self.registers[r_base + *dest as usize] = match &func.constants[*const_idx as usize] {
                        Constant::Nil => Value::Nil, Constant::Boolean(b) => Value::Boolean(*b), Constant::Number(n) => Value::Number(*n), Constant::String(s) => self.alloc_string(s.clone()),
                    };
                }
                Instruction::Move { dest, src } => { self.registers[r_base + *dest as usize] = self.registers[r_base + *src as usize]; }
                Instruction::Add { dest, lhs, rhs } => { self.registers[r_base + *dest as usize] = Value::Number(self.registers[r_base + *lhs as usize].as_number() + self.registers[r_base + *rhs as usize].as_number()); }
                Instruction::Sub { dest, lhs, rhs } => { self.registers[r_base + *dest as usize] = Value::Number(self.registers[r_base + *lhs as usize].as_number() - self.registers[r_base + *rhs as usize].as_number()); }
                Instruction::Mul { dest, lhs, rhs } => { self.registers[r_base + *dest as usize] = Value::Number(self.registers[r_base + *lhs as usize].as_number() * self.registers[r_base + *rhs as usize].as_number()); }
                Instruction::Div { dest, lhs, rhs } => { self.registers[r_base + *dest as usize] = Value::Number(self.registers[r_base + *lhs as usize].as_number() / self.registers[r_base + *rhs as usize].as_number()); }
                Instruction::Lt { dest, lhs, rhs } => { self.registers[r_base + *dest as usize] = Value::Boolean(self.registers[r_base + *lhs as usize].as_number() < self.registers[r_base + *rhs as usize].as_number()); }
                Instruction::Gt { dest, lhs, rhs } => { self.registers[r_base + *dest as usize] = Value::Boolean(self.registers[r_base + *lhs as usize].as_number() > self.registers[r_base + *rhs as usize].as_number()); }
                Instruction::Eq { dest, lhs, rhs } => { self.registers[r_base + *dest as usize] = Value::Boolean(self.registers[r_base + *lhs as usize] == self.registers[r_base + *rhs as usize]); }
                Instruction::Jump { offset } => {
                    ip = (ip as i16 + offset) as usize; self.frames[frame_idx].ip = ip;
                    if *offset < 0 {
                        let count = self.loop_counters.entry(ip).or_insert(0); *count += 1;
                        if *count >= 10 && self.jit.is_some() {
                            self.logs.push(format!("[JIT] Hot loop hit threshold at IP {}. Dispatching to raw x86 runtime.", ip));
                            let jit = self.jit.as_ref().unwrap();
                            let mut regs = [0.0; 256];
                            for i in 0..256 { regs[i] = self.registers[r_base + i].as_number(); }
                            jit.compile_and_run(&mut regs);
                            for i in 0..256 { self.registers[r_base + i] = Value::Number(regs[i]); }
                            self.logs.push("[JIT] Executed optimized machine code payload.".into());
                            ip = func.instructions.iter().position(|x| matches!(x, Instruction::JumpIfFalse { .. })).map(|x| x + 2).unwrap_or(func.instructions.len() - 1);
                            self.frames[frame_idx].ip = ip;
                        }
                    }
                }
                Instruction::JumpIfFalse { cond, offset } => {
                    if self.registers[r_base + *cond as usize].is_falsey() { ip = (ip as i16 + offset) as usize; self.frames[frame_idx].ip = ip; }
                }
                Instruction::Return { src } => {
                    ret = if let Some(r) = src { self.registers[r_base + *r as usize] } else { Value::Nil };
                    self.frames.pop();
                    if !self.frames.is_empty() {
                        let prev = &self.frames[self.frames.len() - 1];
                        let inst_b = &unsafe { &*prev.func }.instructions[prev.ip - 1];
                        if let Instruction::Call { dest, .. } = inst_b { self.registers[prev.reg_base + *dest as usize] = ret; }
                    }
                    self.collect_garbage(); continue;
                }
                Instruction::Call { dest: _, func_idx, arg_start, .. } => {
                    self.frames.push(CallFrame { func: &self.functions[*func_idx as usize], ip: 0, reg_base: r_base + *arg_start as usize });
                    continue;
                }
            }
            if !self.frames.is_empty() { self.frames[frame_idx].ip = ip; }
        }
        ret
    }
    pub fn collect_garbage(&mut self) {
        for v in &self.registers { if let Value::Object(o) = v { unsafe { (**o).marked = true; } } }
        let mut swept = 0;
        let mut survivors = Vec::new();
        for o in &self.objects {
            unsafe {
                if (**o).marked { (**o).marked = false; survivors.push(*o); }
                else { swept += 1; let _ = Box::from_raw(*o); }
            }
        }
        self.objects = survivors;
        if swept > 0 { self.logs.push(format!("[GC] Swept {} garbage objects.", swept)); }
    }
}
impl Drop for VM { fn drop(&mut self) { for o in &self.objects { unsafe { let _ = Box::from_raw(*o); } } } }
