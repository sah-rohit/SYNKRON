import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  const { language, code } = await request.json();
  const sidecarPath = path.join(process.cwd(), 'sidecars', 'python', 'asm_engine.py');

  return new Promise((resolve) => {
    const proc = spawn('python', [sidecarPath, language, code]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      try {
        const json = JSON.parse(stdout);
        resolve(NextResponse.json(json));
      } catch (e) {
        resolve(NextResponse.json({ error: stderr || "Conversion engine failure." }, { status: 500 }));
      }
    });
  });
}
