pub mod lexer;
pub mod parser;
pub mod compiler;
pub mod core_vm;
pub mod jit;

use std::env;
use serde::{Serialize};

#[derive(Serialize)]
pub struct VmResult {
    pub output: String,
    pub logs: Vec<String>,
    pub bytecode: Vec<String>,
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("{{\"error\":\"No source provided\"}}");
        return;
    }
    let source = &args[1];
    
    let lex = lexer::Lexer::new(source);
    let mut parse = parser::Parser::new(lex);
    let stmts = parse.parse_program();
    
    let mut comp = compiler::Compiler::new();
    let main_f = comp.compile(&stmts);
    
    let mut bc = Vec::new();
    for (i, inst) in main_f.instructions.iter().enumerate() {
        bc.push(format!("{:03}: {:?}", i, inst));
    }
    
    let mut vm = core_vm::VM::new(comp.functions);
    let res = vm.run(&main_f);
    
    let mut logs = vm.logs.clone();
    logs.insert(0, format!("[CLI] Loaded Rust VM context with {} inst.", bc.len()));
    
    let out = VmResult {
        output: format!("{:?}", res),
        logs,
        bytecode: bc
    };
    
    println!("{}", serde_json::to_string_pretty(&out).unwrap());
}
