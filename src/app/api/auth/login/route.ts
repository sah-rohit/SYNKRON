/**
 * POST /api/auth/login
 * Works with Neon DB or in-memory store.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setSessionCookie } from '@/lib/auth/unified';

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 422 });
  }

  const { email, password } = parsed.data;
  const { verifyPassword } = await import('@/lib/auth/password');
  const deviceInfo = req.headers.get('user-agent') ?? '';
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { createSession } = await import('@/lib/auth/session');
      const { eq } = await import('drizzle-orm');
      const db = getDb();

      const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
      }

      const token = await createSession(user.id, deviceInfo, ipAddress);
      const res = NextResponse.json({ success: true, user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, plan: user.plan, avatarUrl: user.avatarUrl } });
      setSessionCookie(res, token);
      return res;
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  } else {
    const { memGetUserByEmail, memCreateSession } = await import('@/lib/auth/memory-store');
    const user = memGetUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }
    const token = memCreateSession(user.id, deviceInfo, ipAddress);
    const res = NextResponse.json({ success: true, user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, plan: user.plan, avatarUrl: user.avatarUrl } });
    setSessionCookie(res, token);
    return res;
  }
}
