import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  const { code } = await request.json();
  const sidecarPath = path.join(process.cwd(), 'sidecars', 'python', 'vm_engine.py');

  return new Promise((resolve) => {
    const proc = spawn('python', [sidecarPath, code]);
    let out = '';
    let err = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.stderr.on('data', d => err += d.toString());
    proc.on('close', () => {
      try { resolve(NextResponse.json(JSON.parse(out))); }
      catch (e) { resolve(NextResponse.json({ error: err || "VM Fault." }, { status: 500 })); }
    });
  });
}
