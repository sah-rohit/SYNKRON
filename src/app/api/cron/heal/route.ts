/**
 * Scheduled Healing Cron
 * POST /api/cron/heal
 * 
 * Re-heals documentation that hasn't been healed recently.
 * Protected by CRON_SECRET to prevent unauthorized triggers.
 * Can be called by Vercel Cron, external cron services, or manually.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Verify cron secret if set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const maxAge = body.maxAgeHours || 24; // Re-heal docs older than this
  const limit = body.limit || 10;

  const results: Array<{ filePath: string; status: string; modelUsed?: string; durationMs?: number }> = [];

  try {
    const { getDb, schema } = await import('@/lib/db');
    const { lt, or, isNull, sql } = await import('drizzle-orm');
    const db = getDb();

    const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000);

    // Find docs that haven't been healed recently
    const staleDocs = await db
      .select()
      .from(schema.docFiles)
      .where(
        or(
          isNull(schema.docFiles.lastHealedAt),
          lt(schema.docFiles.lastHealedAt, cutoff)
        )
      )
      .limit(limit);

    if (!staleDocs.length) {
      return NextResponse.json({
        success: true,
        message: 'No stale documents found — all docs are up to date.',
        healed: 0,
      });
    }

    // Heal each stale doc
    const { healDocumentation } = await import('@/lib/ai/healer');
    const { eq } = await import('drizzle-orm');

    for (const doc of staleDocs) {
      try {
        const result = await healDocumentation({
          filename: doc.filePath,
          code: doc.rawCode,
          existingMarkdown: doc.healedMarkdown,
        });

        if (result.success) {
          await db.update(schema.docFiles)
            .set({
              healedMarkdown: result.markdown,
              lastHealedAt: new Date(),
              lastHealedBy: result.modelUsed,
              healCount: sql`${schema.docFiles.healCount} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(schema.docFiles.id, doc.id));

          // Log heal event
          await db.insert(schema.healEvents).values({
            repositoryId: doc.repositoryId,
            docFileId: doc.id,
            triggerType: 'scheduled',
            modelUsed: result.modelUsed,
            status: 'success',
            durationMs: result.durationMs,
            commitMessage: `Scheduled re-heal: ${doc.filePath}`,
          });

          results.push({
            filePath: doc.filePath,
            status: 'healed',
            modelUsed: result.modelUsed,
            durationMs: result.durationMs,
          });
        } else {
          results.push({ filePath: doc.filePath, status: 'failed' });
        }
      } catch (err: any) {
        results.push({ filePath: doc.filePath, status: `error: ${err.message}` });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scheduled healing complete. Processed ${results.length} file(s).`,
      healed: results.filter(r => r.status === 'healed').length,
      results,
    });
  } catch (err: any) {
    // DB not configured - run demo heal
    return NextResponse.json({
      success: true,
      message: 'Database not configured. Scheduled healing requires DATABASE_URL.',
      note: 'Set DATABASE_URL in .env.local and run db:push to enable scheduled healing.',
      healed: 0,
    });
  }
}

// Also support GET for Vercel Cron
export async function GET(req: NextRequest) {
  return POST(req);
}
