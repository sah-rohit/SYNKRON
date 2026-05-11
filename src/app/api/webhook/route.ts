/**
 * SYNKRON GitHub Webhook Handler
 * POST /api/webhook
 *
 * Receives GitHub push events, validates the HMAC-SHA256 signature,
 * persists the event, and triggers the self-healing pipeline.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyGitHubSignature, parsePushPayload } from '@/lib/webhook/validator';
import { analyzeCode, diffSnapshots } from '@/lib/ast/analyzer';
import { healDocumentation } from '@/lib/ai/healer';

// Rate limiting: simple in-memory store (use Redis/Upstash in multi-instance deployments)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  // Rate limiting
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Try again in a minute.' },
      { status: 429 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to read request body' }, { status: 400 });
  }

  // Parse payload
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Validate GitHub signature if a secret is configured
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers.get('x-hub-signature-256');
    const isValid = await verifyGitHubSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }
  }

  // Only process push events
  const event = req.headers.get('x-github-event');
  if (event && event !== 'push') {
    return NextResponse.json({
      success: true,
      message: `Event '${event}' acknowledged but not processed (only 'push' events trigger healing)`,
    });
  }

  const parsed = parsePushPayload(payload);

  // Filter to only TypeScript/JavaScript files
  const relevantFiles = [
    ...parsed.modifiedFiles,
    ...parsed.addedFiles,
  ].filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));

  // Persist webhook log to database (best-effort, non-blocking)
  persistWebhookLog(parsed, payload).catch((err) =>
    console.error('[Webhook] Failed to persist log:', err)
  );

  // Trigger healing for relevant files (async, non-blocking)
  if (relevantFiles.length > 0) {
    triggerHealing(parsed.repoFullName, parsed.branch, relevantFiles).catch((err) =>
      console.error('[Webhook] Failed to trigger healing:', err)
    );
  }

  return NextResponse.json({
    success: true,
    message: 'GitHub webhook received and queued for processing',
    details: {
      repo: parsed.repoFullName,
      branch: parsed.branch,
      commitSha: parsed.commitSha.slice(0, 8),
      commitMessage: parsed.commitMessage,
      author: parsed.authorUsername,
      modifiedFiles: parsed.modifiedFiles,
      relevantFiles,
      healingTriggered: relevantFiles.length > 0,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Persist webhook log to the database.
 * Wrapped in try/catch so a DB failure never breaks the webhook response.
 */
async function persistWebhookLog(
  parsed: ReturnType<typeof parsePushPayload>,
  rawPayload: Record<string, any>
): Promise<void> {
  try {
    const { getDb, schema } = await import('@/lib/db');
    const db = getDb();

    await db.insert(schema.webhookLogs).values({
      rawPayload,
      branch: parsed.branch,
      commitSha: parsed.commitSha,
      commitMessage: parsed.commitMessage,
      authorUsername: parsed.authorUsername,
      modifiedFiles: parsed.modifiedFiles,
    });
  } catch (err: any) {
    // DB not configured — log and continue
    console.warn('[Webhook] DB persist skipped:', err.message);
  }
}

/**
 * Trigger the healing pipeline for modified files.
 * Looks up stored doc files in the DB and re-heals them.
 * Silently skips if DB is not configured.
 */
async function triggerHealing(
  repoFullName: string,
  branch: string,
  relevantFiles: string[]
): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  try {
    const { getDb, schema } = await import('@/lib/db');
    const { eq, and, inArray, sql } = await import('drizzle-orm');
    const { healDocumentation } = await import('@/lib/ai/healer');
    const db = getDb();

    // Find the repository
    const [repo] = await db
      .select({ id: schema.repositories.id })
      .from(schema.repositories)
      .where(eq(schema.repositories.fullName, repoFullName))
      .limit(1);

    if (!repo) {
      console.warn(`[Webhook] Repository ${repoFullName} not found in DB — skipping heal`);
      return;
    }

    // Find stored doc files matching the modified paths
    const docFiles = await db
      .select()
      .from(schema.docFiles)
      .where(
        and(
          eq(schema.docFiles.repositoryId, repo.id),
          inArray(schema.docFiles.filePath, relevantFiles)
        )
      );

    if (!docFiles.length) {
      console.info(`[Webhook] No stored doc files found for modified paths in ${repoFullName}`);
      return;
    }

    // Heal each doc file
    for (const doc of docFiles) {
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

          await db.insert(schema.healEvents).values({
            repositoryId: repo.id,
            docFileId: doc.id,
            triggerType: 'webhook',
            modelUsed: result.modelUsed,
            status: 'success',
            durationMs: result.durationMs,
          });
        }
      } catch (err: any) {
        console.error(`[Webhook] Heal failed for ${doc.filePath}:`, err.message);
        await db.insert(schema.healEvents).values({
          repositoryId: repo.id,
          docFileId: doc.id,
          triggerType: 'webhook',
          status: 'failed',
          errorMessage: err.message,
        }).catch(() => {});
      }
    }
  } catch (err: any) {
    console.error('[Webhook] triggerHealing error:', err.message);
  }
}
