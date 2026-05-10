/**
 * POST /api/auth/register
 * Works with Neon DB (when DATABASE_URL set) or in-memory store (zero config).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setSessionCookie } from '@/lib/auth/unified';

import { zodMsg } from '@/lib/api/zod-error';

const Schema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-z0-9_-]+$/, 'Lowercase letters, numbers, hyphens, underscores only'),
  email: z.string().email(),
  fullName: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });
  }

  const { username, email, fullName, password } = parsed.data;
  const { hashPassword } = await import('@/lib/auth/password');
  const passwordHash = await hashPassword(password);
  const deviceInfo = req.headers.get('user-agent') ?? '';
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';

  if (process.env.DATABASE_URL) {
    // ── Real DB path ──────────────────────────────────────────────────────────
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { createSession } = await import('@/lib/auth/session');
      const { eq, or } = await import('drizzle-orm');
      const db = getDb();

      const existing = await db.select({ id: schema.users.id }).from(schema.users)
        .where(or(eq(schema.users.username, username), eq(schema.users.email, email))).limit(1);
      if (existing.length) return NextResponse.json({ success: false, error: 'Username or email already in use' }, { status: 409 });

      const [user] = await db.insert(schema.users).values({ username, email, fullName, passwordHash })
        .returning({ id: schema.users.id, username: schema.users.username, email: schema.users.email, plan: schema.users.plan });

      const token = await createSession(user.id, deviceInfo, ipAddress);
      const res = NextResponse.json({ success: true, user: { id: user.id, username: user.username, email: user.email, plan: user.plan } });
      setSessionCookie(res, token);
      return res;
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  } else {
    // ── In-memory path ────────────────────────────────────────────────────────
    const { memGetUserByEmail, memGetUserByUsername, memCreateUser, memCreateSession } = await import('@/lib/auth/memory-store');
    if (memGetUserByEmail(email) || memGetUserByUsername(username)) {
      return NextResponse.json({ success: false, error: 'Username or email already in use' }, { status: 409 });
    }
    const user = memCreateUser({ username, email, fullName, passwordHash, plan: 'free', avatarUrl: null });
    const token = memCreateSession(user.id, deviceInfo, ipAddress);
    const res = NextResponse.json({ success: true, user: { id: user.id, username: user.username, email: user.email, plan: user.plan } });
    setSessionCookie(res, token);
    return res;
  }
}
