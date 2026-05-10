/**
 * SYNKRON Self-Healing API
 * POST /api/heal
 * Checks weekly AI quota before calling AI.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeCode, diffSnapshots } from '@/lib/ast/analyzer';
import { healDocumentation } from '@/lib/ai/healer';
import { getAuthUser } from '@/lib/auth/unified';

import { zodMsg } from '@/lib/api/zod-error';

const HealRequestSchema = z.object({
  code: z.string().min(1).max(50_000),
  filename: z.string().min(1).max(500),
  existingMarkdown: z.string().max(100_000).optional().default(''),
  previousCode: z.string().optional(),
  fp: z.string().optional(), // client fingerprint hash
});

async function consumeQuota(req: NextRequest, fp?: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    const quotaRes = await fetch(new URL('/api/ai-quota', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
      body: JSON.stringify({ fp }),
    });
    const data = await quotaRes.json();
    if (!quotaRes.ok || !data.success) return { allowed: false, error: data.error };
    return { allowed: true };
  } catch {
    return { allowed: true }; // fail open
  }
}

export async function POST(req: NextRequest) {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = HealRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });
  }

  const { code, filename, existingMarkdown, previousCode, fp } = parsed.data;

  // Check weekly AI quota
  const quota = await consumeQuota(req, fp);
  if (!quota.allowed) {
    return NextResponse.json({ success: false, error: quota.error ?? 'Weekly AI limit reached' }, { status: 429 });
  }

  // Run AST analysis
  const currentSnapshot = analyzeCode(code);
  let changeSummary: string[] | undefined;

  if (previousCode) {
    const previousSnapshot = analyzeCode(previousCode);
    const diff = diffSnapshots(previousSnapshot, currentSnapshot);
    if (!diff.changed) {
      // No structural changes detected — skip healing
      return NextResponse.json({
        success: true,
        markdown: existingMarkdown,
        modelUsed: 'none (no changes detected)',
        durationMs: 0,
        skipped: true,
      });
    }
    changeSummary = diff.summary;
  }

  // Run AI healing
  const result = await healDocumentation({
    filename,
    code,
    existingMarkdown,
    changeSummary,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 502 }
    );
  }

  // Persist heal event to database (best-effort)
  persistHealEvent(filename, result.modelUsed, result.durationMs).catch((err) =>
    console.warn('[Heal] DB persist skipped:', err.message)
  );

  return NextResponse.json({
    success: true,
    markdown: result.markdown,
    modelUsed: result.modelUsed,
    durationMs: result.durationMs,
    changeSummary,
    astSnapshot: {
      functions: currentSnapshot.functions.map((f) => f.name),
      exports: currentSnapshot.exports,
    },
  });
}

async function persistHealEvent(
  filename: string,
  modelUsed: string,
  durationMs: number
): Promise<void> {
  try {
    const { getDb, schema } = await import('@/lib/db');
    const db = getDb();

    await db.insert(schema.healEvents).values({
      repositoryId: '00000000-0000-0000-0000-000000000000', // placeholder
      triggerType: 'manual',
      modelUsed,
      status: 'success',
      durationMs,
      commitMessage: `Manual heal: ${filename}`,
    });
  } catch {
    // DB not configured — silently skip
  }
}
