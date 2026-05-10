import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, clearSessionCookie } from '@/lib/auth/unified';

const Schema = z.object({ password: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Password required' }, { status: 422 });

  const { verifyPassword } = await import('@/lib/auth/password');

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq } = await import('drizzle-orm');
      const db = getDb();
      const [dbUser] = await db.select().from(schema.users).where(eq(schema.users.id, user.userId)).limit(1);
      if (!dbUser || !(await verifyPassword(parsed.data.password, dbUser.passwordHash))) {
        return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
      }
      await db.delete(schema.users).where(eq(schema.users.id, user.userId));
    } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }); }
  } else {
    const { memGetUserById, memDeleteUser } = await import('@/lib/auth/memory-store');
    const memUser = memGetUserById(user.userId);
    if (!memUser || !(await verifyPassword(parsed.data.password, memUser.passwordHash))) {
      return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
    }
    memDeleteUser(user.userId);
  }

  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}
