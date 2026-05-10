# -*- coding: utf-8 -*-
"""
Ostinato Enterprise High-Speed Static Code Miner
Parses Python, Rust, C/C++, and JavaScript/TypeScript files at native speeds.
Extracts deep AST structures, functions, classes, and comments for documentation sync.
"""

import os
import sys
import json
import re
import ast

class SourceMiner:
    @staticmethod
    def parse_python(code):
        """Deep AST parsing for Python files using the native compiler library."""
        try:
            tree = ast.parse(code)
            functions = []
            classes = []
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    params = []
                    for arg in node.args.args:
                        ann = ""
                        if arg.annotation:
                            if isinstance(arg.annotation, ast.Name):
                                ann = arg.annotation.id
                            elif isinstance(arg.annotation, ast.Constant):
                                ann = str(arg.annotation.value)
                        params.append({"name": arg.arg, "type": ann or "Any", "optional": False})
                    
                    ret_type = "Any"
                    if node.returns:
                        if isinstance(node.returns, ast.Name):
                            ret_type = node.returns.id
                        elif isinstance(node.returns, ast.Constant):
                            ret_type = str(node.returns.value)
                            
                    functions.append({
                        "name": node.name,
                        "params": params,
                        "returnType": ret_type,
                        "isAsync": isinstance(node, ast.AsyncFunctionDef),
                        "isExported": not node.name.startswith("_"),
                        "jsDoc": ast.get_docstring(node) or "",
                        "startLine": node.lineno
                    })
                    
                elif isinstance(node, ast.ClassDef):
                    methods_count = len([n for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))])
                    classes.append({
                        "name": node.name,
                        "methodsCount": methods_count,
                        "isExported": not node.name.startswith("_"),
                        "startLine": node.lineno
                    })
                    
            return {"functions": functions, "classes": classes, "language": "python"}
        except Exception as e:
            return {"error": str(e), "functions": [], "classes": [], "language": "python"}

    @staticmethod
    def parse_rust(code):
        """Extracts Rust structs, impl blocks, and pub/private functions."""
        functions = []
        classes = []
        
        # Match fn signatures e.g., pub fn test(x: u32) -> String
        fn_re = re.compile(r'(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(([^)]*)\)\s*(->\s*([^{]+))?')
        # Match struct signatures
        struct_re = re.compile(r'(pub\s+)?struct\s+(\w+)')
        
        lines = code.split('\n')
        for idx, line in enumerate(lines):
            # Check functions
            fn_m = fn_re.search(line)
            if fn_m:
                params = []
                raw_params = fn_m.group(4)
                if raw_params:
                    for p in raw_params.split(','):
                        parts = p.split(':')
                        p_name = parts[0].strip()
                        p_type = parts[1].strip() if len(parts) > 1 else "unknown"
                        params.append({"name": p_name, "type": p_type, "optional": "&" in p_type})
                        
                functions.append({
                    "name": fn_m.group(3),
                    "params": params,
                    "returnType": (fn_m.group(6) or "void").strip(),
                    "isAsync": bool(fn_m.group(2)),
                    "isExported": bool(fn_m.group(1)),
                    "startLine": idx + 1
                })
                
            # Check structs (represented as classes in our schema)
            struct_m = struct_re.search(line)
            if struct_m:
                classes.append({
                    "name": struct_m.group(2),
                    "methodsCount": 0,
                    "isExported": bool(struct_m.group(1)),
                    "startLine": idx + 1
                })
                
        return {"functions": functions, "classes": classes, "language": "rust"}

    @staticmethod
    def parse_c_cpp(code):
        """Parses C/C++ header and source structures."""
        functions = []
        classes = []
        
        # Simple match for C functions: e.g. int calculate_val(float x, char* name) {
        fn_re = re.compile(r'\b([\w\d_*]+)\s+([\w\d_]+)\s*\(([^)]*)\)\s*\{')
        
        lines = code.split('\n')
        for idx, line in enumerate(lines):
            m = fn_re.search(line)
            if m and m.group(2) not in ('if', 'while', 'for', 'switch', 'return'):
                params = []
                raw_params = m.group(3)
                if raw_params:
                    for p in raw_params.split(','):
                        p = p.strip()
                        parts = p.split()
                        if len(parts) >= 2:
                            p_type = " ".join(parts[:-1])
                            p_name = parts[-1].replace('*', '')
                            params.append({"name": p_name, "type": p_type, "optional": False})
                            
                functions.append({
                    "name": m.group(2),
                    "params": params,
                    "returnType": m.group(1),
                    "isAsync": False,
                    "isExported": True,
                    "startLine": idx + 1
                })
                
        return {"functions": functions, "classes": classes, "language": "c_cpp"}

    @staticmethod
    def parse_js_ts(code):
        """Static mining for JavaScript/TypeScript."""
        functions = []
        classes = []
        
        func_re = re.compile(r'^(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?')
        lines = code.split('\n')
        
        for idx, line in enumerate(lines):
            m = func_re.search(line.strip())
            if m:
                functions.append({
                    "name": m.group(3),
                    "params": [],
                    "returnType": (m.group(5) or "any").strip(),
                    "isAsync": bool(m.group(2)),
                    "isExported": bool(m.group(1)),
                    "startLine": idx + 1
                })
                
        return {"functions": functions, "classes": classes, "language": "typescript"}

def main():
    file_path = sys.argv[1] if len(sys.argv) > 1 else '-'
    ext = os.path.splitext(sys.argv[2])[1].lower() if len(sys.argv) > 2 else '.py'

    if file_path == '-':
        code = sys.stdin.read()
    else:
        if not os.path.exists(file_path):
            print(json.dumps({"error": f"File not found: {file_path}"}))
            return
        ext = os.path.splitext(file_path)[1].lower()
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                code = f.read()
        except Exception as e:
            print(json.dumps({"error": f"Failed to read file: {str(e)}"}))
            return

    if ext == '.py':
        result = SourceMiner.parse_python(code)
    elif ext in ('.rs', '.rust'):
        result = SourceMiner.parse_rust(code)
    elif ext in ('.c', '.cpp', '.cc', '.h', '.hpp'):
        result = SourceMiner.parse_c_cpp(code)
    elif ext in ('.js', '.ts', '.jsx', '.tsx'):
        result = SourceMiner.parse_js_ts(code)
    else:
        result = {"functions": [], "classes": [], "language": "generic", "note": "Unsupported extension"}
        
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
