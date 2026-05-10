// Copy from compiler.rs
use crate::vm::parser::{BinOp, Expr, LiteralValue, Stmt};
use std::collections::HashMap;
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum Instruction {
    LoadConst { dest: u8, const_idx: u16 },
    Move { dest: u8, src: u8 },
    Add { dest: u8, lhs: u8, rhs: u8 },
    Sub { dest: u8, lhs: u8, rhs: u8 },
    Mul { dest: u8, lhs: u8, rhs: u8 },
    Div { dest: u8, lhs: u8, rhs: u8 },
    Lt { dest: u8, lhs: u8, rhs: u8 },
    Gt { dest: u8, lhs: u8, rhs: u8 },
    Eq { dest: u8, lhs: u8, rhs: u8 },
    Jump { offset: i16 },
    JumpIfFalse { cond: u8, offset: i16 },
    Return { src: Option<u8> },
    Call { dest: u8, func_idx: u16, arg_start: u8, arg_count: u8 },
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum Constant { Nil, Boolean(bool), Number(f64), String(String) }

#[derive(Debug, Clone, Serialize)]
pub struct CompiledFunction {
    pub name: String,
    pub param_count: usize,
    pub instructions: Vec<Instruction>,
    pub constants: Vec<Constant>,
}

pub struct Compiler {
    pub constants: Vec<Constant>,
    pub instructions: Vec<Instruction>,
    locals: HashMap<String, u8>,
    next_reg: u8,
    pub functions: Vec<CompiledFunction>,
}

impl Compiler {
    pub fn new() -> Self {
        Compiler { constants: Vec::new(), instructions: Vec::new(), locals: HashMap::new(), next_reg: 0, functions: Vec::new() }
    }
    pub fn compile(&mut self, stmts: &[Stmt]) -> CompiledFunction {
        for stmt in stmts { self.compile_statement(stmt); }
        if self.instructions.is_empty() || !matches!(self.instructions.last(), Some(Instruction::Return { .. })) {
            self.instructions.push(Instruction::Return { src: None });
        }
        CompiledFunction {
            name: "main".to_string(),
            param_count: 0,
            instructions: self.instructions.clone(),
            constants: self.constants.clone(),
        }
    }
    fn compile_statement(&mut self, stmt: &Stmt) {
        match stmt {
            Stmt::Let(name, expr) => {
                let reg = self.allocate_register();
                self.locals.insert(name.clone(), reg);
                self.compile_expression(expr, reg);
            }
            Stmt::Assign(name, expr) => {
                if let Some(&reg) = self.locals.get(name) { self.compile_expression(expr, reg); }
            }
            Stmt::ExprStmt(expr) => {
                let temp = self.allocate_register();
                self.compile_expression(expr, temp);
                self.free_register();
            }
            Stmt::Return(expr_opt) => {
                if let Some(expr) = expr_opt {
                    let temp = self.allocate_register();
                    self.compile_expression(expr, temp);
                    self.instructions.push(Instruction::Return { src: Some(temp) });
                    self.free_register();
                } else {
                    self.instructions.push(Instruction::Return { src: None });
                }
            }
            Stmt::If(cond, then_b, else_b) => {
                let c_reg = self.allocate_register();
                self.compile_expression(cond, c_reg);
                let j_false_idx = self.instructions.len();
                self.instructions.push(Instruction::JumpIfFalse { cond: c_reg, offset: 0 });
                self.free_register();
                for s in then_b { self.compile_statement(s); }
                if let Some(else_body) = else_b {
                    let j_end_idx = self.instructions.len();
                    self.instructions.push(Instruction::Jump { offset: 0 });
                    let else_start = self.instructions.len();
                    self.instructions[j_false_idx] = Instruction::JumpIfFalse { cond: c_reg, offset: (else_start - j_false_idx - 1) as i16 };
                    for s in else_body { self.compile_statement(s); }
                    let end_idx = self.instructions.len();
                    self.instructions[j_end_idx] = Instruction::Jump { offset: (end_idx - j_end_idx - 1) as i16 };
                } else {
                    let end_idx = self.instructions.len();
                    self.instructions[j_false_idx] = Instruction::JumpIfFalse { cond: c_reg, offset: (end_idx - j_false_idx - 1) as i16 };
                }
            }
            Stmt::While(cond, body) => {
                let loop_start = self.instructions.len();
                let c_reg = self.allocate_register();
                self.compile_expression(cond, c_reg);
                let j_false_idx = self.instructions.len();
                self.instructions.push(Instruction::JumpIfFalse { cond: c_reg, offset: 0 });
                self.free_register();
                for s in body { self.compile_statement(s); }
                let jump_back_idx = self.instructions.len();
                self.instructions.push(Instruction::Jump { offset: -((jump_back_idx - loop_start + 1) as i16) });
                let end_idx = self.instructions.len();
                self.instructions[j_false_idx] = Instruction::JumpIfFalse { cond: c_reg, offset: (end_idx - j_false_idx - 1) as i16 };
            }
            Stmt::Fn(name, params, body) => {
                let mut sub = Compiler::new();
                for (i, p) in params.iter().enumerate() { sub.locals.insert(p.clone(), i as u8); }
                sub.next_reg = params.len() as u8;
                let f = sub.compile(body);
                self.functions.push(CompiledFunction { name: name.clone(), param_count: params.len(), instructions: f.instructions, constants: f.constants });
            }
        }
    }
    fn compile_expression(&mut self, expr: &Expr, dest: u8) {
        match expr {
            Expr::Literal(val) => {
                let c = match val { LiteralValue::Nil => Constant::Nil, LiteralValue::Boolean(b) => Constant::Boolean(*b), LiteralValue::Number(n) => Constant::Number(*n), LiteralValue::String(s) => Constant::String(s.clone()) };
                let const_idx = self.add_const(c);
                self.instructions.push(Instruction::LoadConst { dest, const_idx });
            }
            Expr::Variable(name) => {
                if let Some(&src) = self.locals.get(name) {
                    if src != dest { self.instructions.push(Instruction::Move { dest, src }); }
                }
            }
            Expr::Binary(op, lhs, rhs) => {
                let l = self.allocate_register(); self.compile_expression(lhs, l);
                let r = self.allocate_register(); self.compile_expression(rhs, r);
                match op {
                    BinOp::Add => self.instructions.push(Instruction::Add { dest, lhs: l, rhs: r }),
                    BinOp::Sub => self.instructions.push(Instruction::Sub { dest, lhs: l, rhs: r }),
                    BinOp::Mul => self.instructions.push(Instruction::Mul { dest, lhs: l, rhs: r }),
                    BinOp::Div => self.instructions.push(Instruction::Div { dest, lhs: l, rhs: r }),
                    BinOp::Lt => self.instructions.push(Instruction::Lt { dest, lhs: l, rhs: r }),
                    BinOp::Gt => self.instructions.push(Instruction::Gt { dest, lhs: l, rhs: r }),
                    BinOp::Eq => self.instructions.push(Instruction::Eq { dest, lhs: l, rhs: r }),
                }
                self.free_register(); self.free_register();
            }
            Expr::Call(name, args) => {
                let f_idx = self.functions.iter().position(|f| f.name == *name).unwrap_or(0) as u16;
                let a_start = self.next_reg;
                for a in args { let t = self.allocate_register(); self.compile_expression(a, t); }
                self.instructions.push(Instruction::Call { dest, func_idx: f_idx, arg_start: a_start, arg_count: args.len() as u8 });
                for _ in args { self.free_register(); }
            }
        }
    }
    fn add_const(&mut self, v: Constant) -> u16 {
        if let Some(p) = self.constants.iter().position(|c| *c == v) { p as u16 } else { self.constants.push(v); (self.constants.len() - 1) as u16 }
    }
    fn allocate_register(&mut self) -> u8 { let r = self.next_reg; self.next_reg += 1; r }
    fn free_register(&mut self) { if self.next_reg > 0 { self.next_reg -= 1; } }
}
