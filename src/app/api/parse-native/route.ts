import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, filename } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    const ext = filename ? path.extname(filename) : '.py';
    const scriptPath = path.join(process.cwd(), 'src', 'lib', 'engine', 'analyzer.py');
    const pythonBin = process.platform === 'win32' ? 'python' : 'python3';

    // Run python script using native spawn and standard input stream
    const result = await new Promise<string>((resolve, reject) => {
      const py = spawn(pythonBin, [scriptPath, '-', ext]);
      let stdout = '';
      let stderr = '';

      py.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}. Error: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });

      // Write the code to python's stdin and close the stream
      py.stdin.write(code);
      py.stdin.end();
    });

    const parsedData = JSON.parse(result);
    return NextResponse.json({ success: true, ...parsedData });

  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      note: 'Make sure Python is installed and added to your system PATH.' 
    }, { status: 500 });
  }
}
