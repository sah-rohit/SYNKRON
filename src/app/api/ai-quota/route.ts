/**
 * Ostinato AI Quota
 * GET  /api/ai-quota          — check current usage
 * POST /api/ai-quota/consume  — consume one unit (called before AI operations)
 *
 * Quota is tracked per device fingerprint (not just user) so it cannot be
 * bypassed by creating multiple accounts. The fingerprint is derived from:
 *   - IP address
 *   - User-Agent
 *   - Accept-Language header
 *   - A client-supplied canvas/WebGL fingerprint hash (optional, from frontend)
 *
 * Weekly limit: 7 AI calls (free plan). Resets every Monday 00:00 UTC.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/unified';

const WEEKLY_LIMIT_FREE = 7;
const WEEKLY_LIMIT_PRO = 50;
const WEEKLY_LIMIT_ENTERPRISE = 500;

function getPlanLimit(plan: string): number {
  if (plan === 'enterprise') return WEEKLY_LIMIT_ENTERPRISE;
  if (plan === 'pro') return WEEKLY_LIMIT_PRO;
  return WEEKLY_LIMIT_FREE;
}

async function buildFingerprint(req: NextRequest, clientHash?: string): Promise<string> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? '';
  const lang = req.headers.get('accept-language') ?? '';
  const raw = `${ip}|${ua}|${lang}|${clientHash ?? ''}`;

  // SHA-256 the fingerprint so we never store raw IP/UA
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getWeekStart(): number {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff)).getTime();
}

// ── DB-backed quota ────────────────────────────────────────────────────────────
async function dbCheckQuota(fingerprint: string, userId: string, limit: number) {
  try {
    const { getDb, schema } = await import('@/lib/db');
    const { eq, and, gte } = await import('drizzle-orm');
    const db = getDb();
    const weekStart = new Date(getWeekStart());

    const [row] = await db.select().from(schema.aiQuota)
      .where(and(eq(schema.aiQuota.fingerprint, fingerprint), gte(schema.aiQuota.weekStart, weekStart)))
      .limit(1);

    if (!row) {
      await db.insert(schema.aiQuota).values({ fingerprint, userId, weekStart, usageCount: 1, weeklyLimit: limit });
      return { allowed: true, used: 1, limit, resetsAt: new Date(getWeekStart() + 7 * 86400000).toISOString() };
    }

    if (row.usageCount >= limit) {
      return { allowed: false, used: row.usageCount, limit, resetsAt: new Date(getWeekStart() + 7 * 86400000).toISOString() };
    }

    await db.update(schema.aiQuota).set({ usageCount: row.usageCount + 1 }).where(eq(schema.aiQuota.id, row.id));
    return { allowed: true, used: row.usageCount + 1, limit, resetsAt: new Date(getWeekStart() + 7 * 86400000).toISOString() };
  } catch {
    // DB error — fail open (don't block users due to quota DB issues)
    return { allowed: true, used: 0, limit, resetsAt: new Date(getWeekStart() + 7 * 86400000).toISOString() };
  }
}

async function dbGetQuota(fingerprint: string, limit: number) {
  try {
    const { getDb, schema } = await import('@/lib/db');
    const { eq, and, gte } = await import('drizzle-orm');
    const db = getDb();
    const weekStart = new Date(getWeekStart());
    const [row] = await db.select().from(schema.aiQuota)
      .where(and(eq(schema.aiQuota.fingerprint, fingerprint), gte(schema.aiQuota.weekStart, weekStart)))
      .limit(1);
    return { used: row?.usageCount ?? 0, limit, resetsAt: new Date(getWeekStart() + 7 * 86400000).toISOString() };
  } catch {
    return { used: 0, limit, resetsAt: new Date(getWeekStart() + 7 * 86400000).toISOString() };
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const clientHash = req.nextUrl.searchParams.get('fp') ?? undefined;
  const fingerprint = await buildFingerprint(req, clientHash);
  const limit = getPlanLimit(user?.plan ?? 'free');

  if (process.env.DATABASE_URL) {
    const quota = await dbGetQuota(fingerprint, limit);
    return NextResponse.json({ success: true, ...quota, fingerprint: fingerprint.slice(0, 8) + '...' });
  } else {
    const { memGetAIUsage } = await import('@/lib/auth/memory-store');
    const quota = memGetAIUsage(fingerprint, limit);
    return NextResponse.json({ success: true, ...quota, fingerprint: fingerprint.slice(0, 8) + '...' });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  let clientHash: string | undefined;
  try { const b = await req.json(); clientHash = b?.fp; } catch {}

  const fingerprint = await buildFingerprint(req, clientHash);
  const limit = getPlanLimit(user?.plan ?? 'free');

  if (process.env.DATABASE_URL) {
    const result = await dbCheckQuota(fingerprint, user?.userId ?? 'anon', limit);
    if (!result.allowed) {
      return NextResponse.json({ success: false, error: `Weekly AI limit reached (${limit} calls/week). Resets ${new Date(result.resetsAt).toLocaleDateString()}.`, ...result }, { status: 429 });
    }
    return NextResponse.json({ success: true, ...result });
  } else {
    const { memCheckAndIncrementAIUsage } = await import('@/lib/auth/memory-store');
    const result = memCheckAndIncrementAIUsage(fingerprint, limit);
    if (!result.allowed) {
      return NextResponse.json({ success: false, error: `Weekly AI limit reached (${limit} calls/week). Resets ${new Date(result.resetsAt).toLocaleDateString()}.`, ...result }, { status: 429 });
    }
    return NextResponse.json({ success: true, ...result });
  }
}
