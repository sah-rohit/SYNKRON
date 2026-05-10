import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth/unified';

import { zodMsg } from '@/lib/api/zod-error';

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });

  const { verifyPassword, hashPassword } = await import('@/lib/auth/password');

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq } = await import('drizzle-orm');
      const db = getDb();
      const [dbUser] = await db.select().from(schema.users).where(eq(schema.users.id, user.userId)).limit(1);
      if (!dbUser || !(await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash))) {
        return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 401 });
      }
      await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data.newPassword), updatedAt: new Date() }).where(eq(schema.users.id, user.userId));
    } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }); }
  } else {
    const { memGetUserById, memUpdateUser } = await import('@/lib/auth/memory-store');
    const memUser = memGetUserById(user.userId);
    if (!memUser || !(await verifyPassword(parsed.data.currentPassword, memUser.passwordHash))) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 401 });
    }
    memUpdateUser(user.userId, { passwordHash: await hashPassword(parsed.data.newPassword) });
  }
  return NextResponse.json({ success: true });
}
