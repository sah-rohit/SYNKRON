import sys
import json
import subprocess
import os
import tempfile
import dis
import io

def compile_c_to_asm(code):
    with tempfile.NamedTemporaryFile(suffix=".c", delete=False) as tf:
        tf.write(code.encode('utf-8'))
        c_file = tf.name
    
    s_file = c_file.replace(".c", ".s")
    try:
        proc = subprocess.run(["gcc", "-S", "-O2", c_file, "-o", s_file], capture_output=True, text=True)
        if proc.returncode != 0:
            return {"error": proc.stderr}
        
        with open(s_file, 'r') as f:
            asm = f.read()
        return {"assembly": asm}
    finally:
        for f in [c_file, s_file]:
            if os.path.exists(f): os.remove(f)

def dis_python(code):
    try:
        buf = io.StringIO()
        compiled = compile(code, "<string>", "exec")
        dis.dis(compiled, file=buf)
        return {"assembly": buf.getvalue()}
    except Exception as e:
        return {"error": str(e)}

def compile_java_to_bytecode(code):
    # Extract class name
    import re
    match = re.search(r'class\s+(\w+)', code)
    class_name = match.group(1) if match else "TempClass"
    
    with tempfile.TemporaryDirectory() as td:
        j_file = os.path.join(td, f"{class_name}.java")
        with open(j_file, 'w') as f:
            f.write(code)
        
        comp = subprocess.run(["javac", j_file], capture_output=True, text=True, cwd=td)
        if comp.returncode != 0:
            return {"error": comp.stderr}
        
        p = subprocess.run(["javap", "-c", class_name], capture_output=True, text=True, cwd=td)
        return {"assembly": p.stdout}

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: asm_engine.py <lang> <code>"}))
        return

    lang = sys.argv[1].lower()
    code = sys.argv[2]

    if lang in ['c', 'cpp', 'c++']:
        res = compile_c_to_asm(code)
    elif lang == 'python':
        res = dis_python(code)
    elif lang == 'java':
        res = compile_java_to_bytecode(code)
    else:
        res = {"error": f"Unsupported engine language: {lang}"}

    print(json.dumps(res))

if __name__ == "__main__":
    main()
