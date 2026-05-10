/**
 * Ostinato Security Scanner API
 * POST /api/security/scan
 *
 * Invokes scripts/scanner.py to scan the project for:
 *   - Hardcoded secrets / API keys
 *   - Vulnerability patterns (eval, SQL injection, XSS)
 *   - Sensitive data leaks
 *   - Config issues
 *
 * Also optionally runs the C hasher for file integrity checking.
 *
 * Body: { path?: string, minSeverity?: 'critical'|'high'|'medium'|'low'|'info', includeIntegrity?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const ScanSchema = z.object({
  path: z.string().max(500).optional().default('src'),
  minSeverity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional().default('low'),
  includeIntegrity: z.boolean().optional().default(false),
});

// Resolve project root (two levels up from src/app/api/security/scan)
const PROJECT_ROOT = path.resolve(process.cwd());
const SCANNER_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'scanner.py');
const HASHER_BIN = path.join(PROJECT_ROOT, 'scripts', 'hasher');

export async function POST(req: NextRequest) {
  // Auth check
  const token = req.cookies.get('ostinato_session')?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Validate session if DB is configured
  if (process.env.DATABASE_URL) {
    try {
      const { validateSession } = await import('@/lib/auth/session');
      const session = await validateSession(token);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
      }
    } catch { /* DB not ready */ }
  }

  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }

  const parsed = ScanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 422 });
  }

  const { path: scanPath, minSeverity, includeIntegrity } = parsed.data;

  // Sanitize path — must stay within project root
  const resolvedScanPath = path.resolve(PROJECT_ROOT, scanPath);
  if (!resolvedScanPath.startsWith(PROJECT_ROOT)) {
    return NextResponse.json({ success: false, error: 'Path traversal not allowed' }, { status: 400 });
  }

  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  // ── Run Python scanner ────────────────────────────────────────────────────
  try {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const { stdout, stderr } = await execAsync(
      `${python} "${SCANNER_SCRIPT}" "${resolvedScanPath}" --json --min-severity ${minSeverity}`,
      { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 }
    );

    if (stderr && !stdout) {
      results.scanner = { error: stderr.trim() };
    } else {
      results.scanner = JSON.parse(stdout);
    }
  } catch (err: any) {
    results.scanner = {
      error: `Python scanner failed: ${err.message}`,
      findings: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0, files_scanned: 0, scan_duration_ms: 0 },
    };
  }

  // ── Run C hasher (optional, best-effort) ─────────────────────────────────
  if (includeIntegrity) {
    try {
      const { stdout } = await execAsync(
        `"${HASHER_BIN}" "${resolvedScanPath}"`,
        { timeout: 15_000, maxBuffer: 50 * 1024 * 1024 }
      );
      results.integrity = JSON.parse(stdout);
    } catch {
      results.integrity = { error: 'Hasher binary not available. Run: bash scripts/build_hasher.sh' };
    }
  }

  // ── Persist scan result to DB (best-effort) ───────────────────────────────
  if (process.env.DATABASE_URL) {
    persistScanResult(results).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    scannedPath: scanPath,
    totalDurationMs: Date.now() - startTime,
    ...results,
  });
}

async function persistScanResult(results: Record<string, unknown>) {
  try {
    const { getDb, schema } = await import('@/lib/db');
    const db = getDb();
    await db.insert(schema.securityScans).values({
      scanPath: 'src',
      findings: (results.scanner as any)?.findings ?? [],
      summary: (results.scanner as any)?.summary ?? {},
    });
  } catch { /* schema may not have this table yet */ }
}
