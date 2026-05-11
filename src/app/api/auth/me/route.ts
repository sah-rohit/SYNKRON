/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Used by the frontend after OAuth redirects to pick up session data
 * without exposing it in URL parameters.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/unified';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Fetch full profile from DB or memory store
  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq } = await import('drizzle-orm');
      const db = getDb();
      const [dbUser] = await db
        .select({
          id: schema.users.id,
          username: schema.users.username,
          email: schema.users.email,
          fullName: schema.users.fullName,
          plan: schema.users.plan,
          avatarUrl: schema.users.avatarUrl,
          createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .where(eq(schema.users.id, user.userId))
        .limit(1);

      if (!dbUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      return NextResponse.json({ success: true, user: dbUser });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  } else {
    const { memGetUserById } = await import('@/lib/auth/memory-store');
    const memUser = memGetUserById(user.userId);
    if (!memUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    return NextResponse.json({
      success: true,
      user: {
        id: memUser.id,
        username: memUser.username,
        email: memUser.email,
        fullName: memUser.fullName,
        plan: memUser.plan,
        avatarUrl: memUser.avatarUrl,
        createdAt: memUser.createdAt,
      },
    });
  }
}
