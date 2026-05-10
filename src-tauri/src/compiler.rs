use crate::parser::{BinOp, Expr, LiteralValue, Stmt};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
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

#[derive(Debug, Clone, PartialEq)]
pub enum Constant {
    Nil,
    Boolean(bool),
    Number(f64),
    String(String),
}

#[derive(Debug, Clone)]
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
        Compiler {
            constants: Vec::new(),
            instructions: Vec::new(),
            locals: HashMap::new(),
            next_reg: 0,
            functions: Vec::new(),
        }
    }

    pub fn compile(&mut self, stmts: &[Stmt]) -> CompiledFunction {
        for stmt in stmts {
            self.compile_statement(stmt);
        }
        // Always ensure a return instruction at the end of the program
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
                if let Some(&reg) = self.locals.get(name) {
                    self.compile_expression(expr, reg);
                }
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
            Stmt::If(cond, then_branch, else_branch) => {
                let cond_reg = self.allocate_register();
                self.compile_expression(cond, cond_reg);

                // Placeholder for jump if false
                let jump_false_idx = self.instructions.len();
                self.instructions.push(Instruction::JumpIfFalse { cond: cond_reg, offset: 0 });
                self.free_register(); // Free cond_reg

                let _then_start = self.instructions.len();
                for s in then_branch {
                    self.compile_statement(s);
                }

                if let Some(else_branch) = else_branch {
                    let jump_end_idx = self.instructions.len();
                    self.instructions.push(Instruction::Jump { offset: 0 });

                    let else_start = self.instructions.len();
                    // Fix up JumpIfFalse
                    let offset_to_else = (else_start - jump_false_idx - 1) as i16;
                    self.instructions[jump_false_idx] = Instruction::JumpIfFalse {
                        cond: cond_reg,
                        offset: offset_to_else,
                    };

                    for s in else_branch {
                        self.compile_statement(s);
                    }

                    let end_idx = self.instructions.len();
                    let offset_to_end = (end_idx - jump_end_idx - 1) as i16;
                    self.instructions[jump_end_idx] = Instruction::Jump { offset: offset_to_end };
                } else {
                    let end_idx = self.instructions.len();
                    let offset_to_end = (end_idx - jump_false_idx - 1) as i16;
                    self.instructions[jump_false_idx] = Instruction::JumpIfFalse {
                        cond: cond_reg,
                        offset: offset_to_end,
                    };
                }
            }
            Stmt::While(cond, body) => {
                let loop_start = self.instructions.len();

                let cond_reg = self.allocate_register();
                self.compile_expression(cond, cond_reg);

                let jump_false_idx = self.instructions.len();
                self.instructions.push(Instruction::JumpIfFalse { cond: cond_reg, offset: 0 });
                self.free_register(); // Free cond_reg

                for s in body {
                    self.compile_statement(s);
                }

                let jump_back_idx = self.instructions.len();
                let offset_back = -((jump_back_idx - loop_start + 1) as i16);
                self.instructions.push(Instruction::Jump { offset: offset_back });

                let loop_end = self.instructions.len();
                let offset_to_end = (loop_end - jump_false_idx - 1) as i16;
                self.instructions[jump_false_idx] = Instruction::JumpIfFalse {
                    cond: cond_reg,
                    offset: offset_to_end,
                };
            }
            Stmt::Fn(name, params, body) => {
                // Compile function to sub-compiler
                let mut fn_compiler = Compiler::new();
                for (i, p) in params.iter().enumerate() {
                    fn_compiler.locals.insert(p.clone(), i as u8);
                }
                fn_compiler.next_reg = params.len() as u8;

                let func = fn_compiler.compile(body);
                self.functions.push(CompiledFunction {
                    name: name.clone(),
                    param_count: params.len(),
                    instructions: func.instructions,
                    constants: func.constants,
                });
            }
        }
    }

    fn compile_expression(&mut self, expr: &Expr, dest: u8) {
        match expr {
            Expr::Literal(val) => {
                let const_val = match val {
                    LiteralValue::Nil => Constant::Nil,
                    LiteralValue::Boolean(b) => Constant::Boolean(*b),
                    LiteralValue::Number(n) => Constant::Number(*n),
                    LiteralValue::String(s) => Constant::String(s.clone()),
                };
                let const_idx = self.add_constant(const_val);
                self.instructions.push(Instruction::LoadConst { dest, const_idx });
            }
            Expr::Variable(name) => {
                if let Some(&src) = self.locals.get(name) {
                    if src != dest {
                        self.instructions.push(Instruction::Move { dest, src });
                    }
                }
            }
            Expr::Binary(op, lhs, rhs) => {
                let lhs_reg = self.allocate_register();
                self.compile_expression(lhs, lhs_reg);

                let rhs_reg = self.allocate_register();
                self.compile_expression(rhs, rhs_reg);

                match op {
                    BinOp::Add => self.instructions.push(Instruction::Add { dest, lhs: lhs_reg, rhs: rhs_reg }),
                    BinOp::Sub => self.instructions.push(Instruction::Sub { dest, lhs: lhs_reg, rhs: rhs_reg }),
                    BinOp::Mul => self.instructions.push(Instruction::Mul { dest, lhs: lhs_reg, rhs: rhs_reg }),
                    BinOp::Div => self.instructions.push(Instruction::Div { dest, lhs: lhs_reg, rhs: rhs_reg }),
                    BinOp::Lt => self.instructions.push(Instruction::Lt { dest, lhs: lhs_reg, rhs: rhs_reg }),
                    BinOp::Gt => self.instructions.push(Instruction::Gt { dest, lhs: lhs_reg, rhs: rhs_reg }),
                    BinOp::Eq => self.instructions.push(Instruction::Eq { dest, lhs: lhs_reg, rhs: rhs_reg }),
                }

                self.free_register(); // Free rhs_reg
                self.free_register(); // Free lhs_reg
            }
            Expr::Call(name, args) => {
                // Find function
                let func_idx = self.functions.iter().position(|f| f.name == *name).unwrap_or(0) as u16;

                let arg_start = self.next_reg;
                for arg in args {
                    let temp = self.allocate_register();
                    self.compile_expression(arg, temp);
                }

                self.instructions.push(Instruction::Call {
                    dest,
                    func_idx,
                    arg_start,
                    arg_count: args.len() as u8,
                });

                // Free all argument registers
                for _ in args {
                    self.free_register();
                }
            }
        }
    }

    fn add_constant(&mut self, val: Constant) -> u16 {
        if let Some(pos) = self.constants.iter().position(|c| *c == val) {
            pos as u16
        } else {
            self.constants.push(val);
            (self.constants.len() - 1) as u16
        }
    }

    fn allocate_register(&mut self) -> u8 {
        let r = self.next_reg;
        self.next_reg += 1;
        r
    }

    fn free_register(&mut self) {
        if self.next_reg > 0 {
            self.next_reg -= 1;
        }
    }
}
