import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const TIMEOUT_MS = 30_000;

export async function POST(request: NextRequest) {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { code } = body;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'code is required and must be a string' }, { status: 400 });
  }
  if (code.length > 50_000) {
    return NextResponse.json({ error: 'code exceeds 50,000 character limit' }, { status: 413 });
  }

  const sidecarPath = path.join(process.cwd(), 'sidecars', 'python', 'vm_engine.py');
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3';

  return new Promise<NextResponse>((resolve) => {
    const proc = spawn(pythonBin, [sidecarPath, code]);

    let out = '';
    let err = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
      resolve(NextResponse.json({ error: 'VM execution timed out.' }, { status: 504 }));
    }, TIMEOUT_MS);

    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });

    proc.on('close', () => {
      if (timedOut) return;
      clearTimeout(timer);
      try {
        resolve(NextResponse.json(JSON.parse(out)));
      } catch {
        resolve(NextResponse.json({ error: err || 'VM Fault.' }, { status: 500 }));
      }
    });

    proc.on('error', (e) => {
      if (timedOut) return;
      clearTimeout(timer);
      resolve(NextResponse.json(
        { error: `Failed to start Python process: ${e.message}. Make sure Python is installed and in PATH.` },
        { status: 500 }
      ));
    });
  });
}
