// Prevents additional console window on Windows in release, do not remove!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use std::collections::HashMap;
use std::path::Path;
use std::fs;

// Define FFI from C++
extern "C" {
    fn compute_logic_hash(source_code: *const c_char, lang: *const c_char) -> *mut c_char;
    fn free_string(ptr: *mut c_char);
}

#[derive(Serialize, Deserialize, Debug)]
struct HashResult {
    language: String,
    logic_hash: String,
}

struct AppState {
    // Store previous hashes of watched files/functions
    watched_hashes: Mutex<HashMap<String, String>>,
}

#[tauri::command]
fn calculate_hash(source: String, language: String) -> Result<String, String> {
    unsafe {
        let c_source = CString::new(source).map_err(|e| e.to_string())?;
        let c_lang = CString::new(language).map_err(|e| e.to_string())?;
        
        let ptr = compute_logic_hash(c_source.as_ptr(), c_lang.as_ptr());
        if ptr.is_null() {
            return Err("FFI call failed".into());
        }
        
        let result = CStr::from_ptr(ptr).to_string_lossy().into_owned();
        free_string(ptr);
        
        Ok(result)
    }
}

#[tauri::command]
fn watch_and_detect_changes(
    state: tauri::State<'_, AppState>,
    file_path: String,
    source: String,
    language: String
) -> Result<String, String> {
    let hash_json = calculate_hash(source, language)?;
    let parsed: HashResult = serde_json::from_str(&hash_json).map_err(|e| e.to_string())?;
    
    let mut map = state.watched_hashes.lock().unwrap();
    let prev_hash = map.get(&file_path);
    
    let changed = match prev_hash {
        Some(h) => h != &parsed.logic_hash,
        None => true, // First time watching
    };

    // Update state
    map.insert(file_path.clone(), parsed.logic_hash.clone());

    if changed {
        Ok(format!("{{\"status\":\"HEAL_TRIGGERED\", \"file\":\"{}\"}}", file_path))
    } else {
        Ok(format!("{{\"status\":\"UNCHANGED\", \"file\":\"{}\"}}", file_path))
    }
}

mod vm;

use vm::lexer::Lexer;
use vm::parser::Parser;
use vm::compiler::Compiler;
use vm::core_vm::VM;

#[derive(Serialize, Deserialize)]
pub struct VmResult {
    pub output: String,
    pub logs: Vec<String>,
    pub bytecode: Vec<String>,
}

#[tauri::command]
fn execute_vm(source: String) -> Result<VmResult, String> {
    let lexer = Lexer::new(&source);
    let mut parser = Parser::new(lexer);
    let stmts = parser.parse_program();
    
    let mut compiler = Compiler::new();
    let func = compiler.compile(&stmts);
    
    let mut bytecode = Vec::new();
    for (idx, inst) in func.instructions.iter().enumerate() {
        bytecode.push(format!("{:03}: {:?}", idx, inst));
    }
    
    let mut runtime = VM::new(compiler.functions);
    let res = runtime.run(&func);
    
    let mut log_history = runtime.logs.clone();
    log_history.insert(0, format!("[System] Loaded VM context with {} instructions.", bytecode.len()));

    Ok(VmResult {
        output: format!("{:?}", res),
        logs: log_history,
        bytecode
    })
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            watched_hashes: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            calculate_hash,
            watch_and_detect_changes,
            execute_vm
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
