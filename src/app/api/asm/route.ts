import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const TIMEOUT_MS = 30_000;

export async function POST(request: NextRequest) {
  let body: { language?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { language, code } = body;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'code is required and must be a string' }, { status: 400 });
  }
  if (code.length > 50_000) {
    return NextResponse.json({ error: 'code exceeds 50,000 character limit' }, { status: 413 });
  }

  const sidecarPath = path.join(process.cwd(), 'sidecars', 'python', 'asm_engine.py');
  // Use 'python' on Windows, 'python3' on Unix
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3';

  return new Promise<NextResponse>((resolve) => {
    const proc = spawn(pythonBin, [sidecarPath, String(language ?? 'python'), code]);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
      resolve(NextResponse.json({ error: 'Assembly conversion timed out.' }, { status: 504 }));
    }, TIMEOUT_MS);

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', () => {
      if (timedOut) return;
      clearTimeout(timer);
      try {
        const json = JSON.parse(stdout);
        resolve(NextResponse.json(json));
      } catch {
        resolve(NextResponse.json({ error: stderr || 'Assembly conversion engine failure.' }, { status: 500 }));
      }
    });

    proc.on('error', (err) => {
      if (timedOut) return;
      clearTimeout(timer);
      resolve(NextResponse.json(
        { error: `Failed to start Python process: ${err.message}. Make sure Python is installed and in PATH.` },
        { status: 500 }
      ));
    });
  });
}
