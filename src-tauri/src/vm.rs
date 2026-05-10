use crate::compiler::{Constant, CompiledFunction, Instruction};
use crate::jit::JitEngine;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub enum GcValue {
    String(String),
}

pub struct GcObject {
    pub marked: bool,
    pub value: GcValue,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Value {
    Nil,
    Boolean(bool),
    Number(f64),
    Object(*mut GcObject),
}

impl Value {
    pub fn is_falsey(&self) -> bool {
        match self {
            Value::Nil => true,
            Value::Boolean(b) => !b,
            _ => false,
        }
    }

    pub fn as_number(&self) -> f64 {
        match self {
            Value::Number(n) => *n,
            _ => 0.0,
        }
    }
}

pub struct CallFrame {
    pub func: *const CompiledFunction,
    pub ip: usize,
    pub reg_base: usize,
}

pub struct VM {
    pub registers: Vec<Value>,
    pub globals: HashMap<String, Value>,
    pub objects: Vec<*mut GcObject>,
    pub frames: Vec<CallFrame>,
    pub functions: Vec<CompiledFunction>,
    pub loop_counters: HashMap<usize, usize>,
    jit: Option<JitEngine>,
}

impl VM {
    pub fn new(functions: Vec<CompiledFunction>) -> Self {
        let jit = JitEngine::new().ok();
        VM {
            registers: vec![Value::Nil; 256],
            globals: HashMap::new(),
            objects: Vec::new(),
            frames: Vec::new(),
            functions,
            loop_counters: HashMap::new(),
            jit,
        }
    }

    pub fn alloc_string(&mut self, s: String) -> Value {
        let obj = Box::into_raw(Box::new(GcObject {
            marked: false,
            value: GcValue::String(s),
        }));
        self.objects.push(obj);
        Value::Object(obj)
    }

    pub fn run(&mut self, main_func: &CompiledFunction) -> Value {
        let main_frame = CallFrame {
            func: main_func as *const CompiledFunction,
            ip: 0,
            reg_base: 0,
        };
        self.frames.push(main_frame);

        let mut return_val = Value::Nil;

        while !self.frames.is_empty() {
            let frame_idx = self.frames.len() - 1;
            let (mut ip, reg_base, func_ptr) = {
                let frame = &self.frames[frame_idx];
                (frame.ip, frame.reg_base, frame.func)
            };
            let func = unsafe { &*func_ptr };

            if ip >= func.instructions.len() {
                self.frames.pop();
                continue;
            }

            let inst = &func.instructions[ip];
            ip += 1;

            match inst {
                Instruction::LoadConst { dest, const_idx } => {
                    let val = match &func.constants[*const_idx as usize] {
                        Constant::Nil => Value::Nil,
                        Constant::Boolean(b) => Value::Boolean(*b),
                        Constant::Number(n) => Value::Number(*n),
                        Constant::String(s) => self.alloc_string(s.clone()),
                    };
                    self.registers[reg_base + *dest as usize] = val;
                }
                Instruction::Move { dest, src } => {
                    self.registers[reg_base + *dest as usize] = self.registers[reg_base + *src as usize];
                }
                Instruction::Add { dest, lhs, rhs } => {
                    let l = self.registers[reg_base + *lhs as usize].as_number();
                    let r = self.registers[reg_base + *rhs as usize].as_number();
                    self.registers[reg_base + *dest as usize] = Value::Number(l + r);
                }
                Instruction::Sub { dest, lhs, rhs } => {
                    let l = self.registers[reg_base + *lhs as usize].as_number();
                    let r = self.registers[reg_base + *rhs as usize].as_number();
                    self.registers[reg_base + *dest as usize] = Value::Number(l - r);
                }
                Instruction::Mul { dest, lhs, rhs } => {
                    let l = self.registers[reg_base + *lhs as usize].as_number();
                    let r = self.registers[reg_base + *rhs as usize].as_number();
                    self.registers[reg_base + *dest as usize] = Value::Number(l * r);
                }
                Instruction::Div { dest, lhs, rhs } => {
                    let l = self.registers[reg_base + *lhs as usize].as_number();
                    let r = self.registers[reg_base + *rhs as usize].as_number();
                    self.registers[reg_base + *dest as usize] = Value::Number(l / r);
                }
                Instruction::Lt { dest, lhs, rhs } => {
                    let l = self.registers[reg_base + *lhs as usize].as_number();
                    let r = self.registers[reg_base + *rhs as usize].as_number();
                    self.registers[reg_base + *dest as usize] = Value::Boolean(l < r);
                }
                Instruction::Gt { dest, lhs, rhs } => {
                    let l = self.registers[reg_base + *lhs as usize].as_number();
                    let r = self.registers[reg_base + *rhs as usize].as_number();
                    self.registers[reg_base + *dest as usize] = Value::Boolean(l > r);
                }
                Instruction::Eq { dest, lhs, rhs } => {
                    let l = self.registers[reg_base + *lhs as usize];
                    let r = self.registers[reg_base + *rhs as usize];
                    self.registers[reg_base + *dest as usize] = Value::Boolean(l == r);
                }
                Instruction::Jump { offset } => {
                    ip = (ip as i16 + offset) as usize;
                    self.frames[frame_idx].ip = ip;

                    if *offset < 0 {
                        let loop_ip = ip;
                        let count = self.loop_counters.entry(loop_ip).or_insert(0);
                        *count += 1;

                        if *count >= 10 && self.jit.is_some() {
                            println!("[JIT] Hot loop detected at IP {}. Compiling...", loop_ip);
                            if let Some(jit) = &self.jit {
                                let mut reg_array = [0.0; 256];
                                for i in 0..256 {
                                    reg_array[i] = self.registers[reg_base + i].as_number();
                                }
                                jit.compile_and_run(&mut reg_array);
                                println!("[JIT] Loop execution finished on native CPU!");
                                for i in 0..256 {
                                    self.registers[reg_base + i] = Value::Number(reg_array[i]);
                                }
                                ip = func.instructions.iter().position(|inst| {
                                    matches!(inst, Instruction::JumpIfFalse { .. })
                                }).map(|idx| idx + 4).unwrap_or(func.instructions.len() - 1);
                                self.frames[frame_idx].ip = ip;
                            }
                        }
                    }
                }
                Instruction::JumpIfFalse { cond, offset } => {
                    if self.registers[reg_base + *cond as usize].is_falsey() {
                        ip = (ip as i16 + offset) as usize;
                        self.frames[frame_idx].ip = ip;
                    }
                }
                Instruction::Return { src } => {
                    if let Some(r) = src {
                        return_val = self.registers[reg_base + *r as usize];
                    } else {
                        return_val = Value::Nil;
                    }
                    self.frames.pop();
                    if !self.frames.is_empty() {
                        let prev_frame = &self.frames[self.frames.len() - 1];
                        if prev_frame.ip > 0 {
                            let last_inst = &unsafe { &*prev_frame.func }.instructions[prev_frame.ip - 1];
                            if let Instruction::Call { dest, .. } = last_inst {
                                let prev_reg_base = prev_frame.reg_base;
                                self.registers[prev_reg_base + *dest as usize] = return_val;
                            }
                        }
                    }
                    self.collect_garbage();
                    continue;
                }
                Instruction::Call { dest: _, func_idx, arg_start, arg_count: _ } => {
                    let target_func = &self.functions[*func_idx as usize];
                    let new_frame = CallFrame {
                        func: target_func as *const CompiledFunction,
                        ip: 0,
                        reg_base: reg_base + *arg_start as usize,
                    };
                    self.frames.push(new_frame);
                    continue;
                }
            }

            if !self.frames.is_empty() {
                self.frames[frame_idx].ip = ip;
            }
        }

        return_val
    }

    pub fn collect_garbage(&mut self) {
        println!("[GC] Starting mark-and-sweep garbage collection...");
        // 1. Mark Phase
        // Mark roots in registers
        for val in &self.registers {
            if let Value::Object(obj) = val {
                unsafe { (**obj).marked = true; }
            }
        }
        // Mark roots in globals
        for val in self.globals.values() {
            if let Value::Object(obj) = val {
                unsafe { (**obj).marked = true; }
            }
        }

        // 2. Sweep Phase
        let mut swept = 0;
        let mut survivor_count = 0;
        let mut survivors = Vec::new();

        for obj in &self.objects {
            unsafe {
                if (**obj).marked {
                    (**obj).marked = false; // Reset for next GC
                    survivor_count += 1;
                    survivors.push(*obj);
                } else {
                    swept += 1;
                    let _ = Box::from_raw(*obj); // Free memory!
                }
            }
        }

        self.objects = survivors;
        println!("[GC] Collection complete: Swept {} objects, {} survived.", swept, survivor_count);
    }
}

impl Drop for VM {
    fn drop(&mut self) {
        for obj in &self.objects {
            unsafe {
                let _ = Box::from_raw(*obj);
            }
        }
    }
}
