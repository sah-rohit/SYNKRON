/**
 * Repository Access Token Management
 * GET    /api/repositories/:id/tokens  — list tokens (prefix only, never full)
 * POST   /api/repositories/:id/tokens  — create new token (shown once)
 * DELETE /api/repositories/:id/tokens/:tokenId — revoke token
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { zodMsg } from '@/lib/api/zod-error';

const CreateTokenSchema = z.object({
  label: z.string().min(1).max(100),
  scopes: z.array(z.enum(['read', 'write', 'webhook', 'admin'])).min(1),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

async function getAuthedSession(req: NextRequest, repoId: string) {
  const token = req.cookies.get('ostinato_session')?.value;
  if (!token) return null;
  if (!process.env.DATABASE_URL) return { demo: true, userId: 'demo' };

  const { validateSession } = await import('@/lib/auth/session');
  const { getDb, schema } = await import('@/lib/db');
  const { eq, and } = await import('drizzle-orm');

  const session = await validateSession(token);
  if (!session) return null;

  const db = getDb();
  const [repo] = await db
    .select({ id: schema.repositories.id })
    .from(schema.repositories)
    .where(and(eq(schema.repositories.id, repoId), eq(schema.repositories.userId, session.userId)))
    .limit(1);

  return repo ? session : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuthedSession(req, id);
  if (!session) return NextResponse.json({ success: false, error: 'Not found or not authenticated' }, { status: 404 });

  if ((session as any).demo) {
    return NextResponse.json({ success: true, tokens: [], note: 'Demo mode' });
  }

  const { getDb, schema } = await import('@/lib/db');
  const { eq } = await import('drizzle-orm');
  const db = getDb();
  const tokens = await db
    .select({
      id: schema.repoAccessTokens.id,
      label: schema.repoAccessTokens.label,
      tokenPrefix: schema.repoAccessTokens.tokenPrefix,
      scopes: schema.repoAccessTokens.scopes,
      lastUsedAt: schema.repoAccessTokens.lastUsedAt,
      expiresAt: schema.repoAccessTokens.expiresAt,
      createdAt: schema.repoAccessTokens.createdAt,
    })
    .from(schema.repoAccessTokens)
    .where(eq(schema.repoAccessTokens.repositoryId, id));

  return NextResponse.json({ success: true, tokens });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuthedSession(req, id);
  if (!session) return NextResponse.json({ success: false, error: 'Not found or not authenticated' }, { status: 404 });

  if ((session as any).demo) {
    return NextResponse.json({ success: true, token: 'oat_demo_' + crypto.randomUUID().replace(/-/g, ''), note: 'Demo mode — token not persisted' });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = CreateTokenSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });

  // Generate a secure token
  const rawToken = 'oat_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // Hash it for storage
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(rawToken), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode('ostinato-token'), iterations: 10000, hash: 'SHA-256' }, keyMaterial, 256);
  const tokenHash = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');

  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 86400000)
    : undefined;

  const { getDb, schema } = await import('@/lib/db');
  const db = getDb();
  const [record] = await db.insert(schema.repoAccessTokens).values({
    repositoryId: id,
    label: parsed.data.label,
    tokenHash,
    tokenPrefix: rawToken.slice(0, 12),
    scopes: parsed.data.scopes,
    expiresAt,
  }).returning({ id: schema.repoAccessTokens.id, label: schema.repoAccessTokens.label });

  return NextResponse.json({
    success: true,
    token: rawToken,  // shown ONCE — not stored in plaintext
    tokenId: record.id,
    label: record.label,
    warning: 'Copy this token now. It will not be shown again.',
  });
}
