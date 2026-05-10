import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth/unified';

import { zodMsg } from '@/lib/api/zod-error';

const Schema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  username: z.string().min(3).max(32).regex(/^[a-z0-9_-]+$/).optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq } = await import('drizzle-orm');
      await getDb().update(schema.users).set({ ...parsed.data, updatedAt: new Date() }).where(eq(schema.users.id, user.userId));
    } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }); }
  } else {
    const { memUpdateUser } = await import('@/lib/auth/memory-store');
    memUpdateUser(user.userId, parsed.data);
  }
  return NextResponse.json({ success: true });
}
