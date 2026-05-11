import { NextRequest, NextResponse } from 'next/server';

import { getAuthUser } from '@/lib/auth/unified';



export async function GET(req: NextRequest) {

  const user = await getAuthUser(req);

  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });



  const token = req.cookies.get('synkron_session')?.value ?? '';



  if (process.env.DATABASE_URL) {

    try {

      const { getDb, schema } = await import('@/lib/db');

      const { eq } = await import('drizzle-orm');

      const db = getDb();

      const rows = await db.select().from(schema.sessions).where(eq(schema.sessions.userId, user.userId));

      const now = new Date();

      return NextResponse.json({ success: true, sessions: rows.filter(r => r.expiresAt > now).map(r => ({ id: r.id, deviceInfo: r.deviceInfo, ipAddress: r.ipAddress, location: r.location, createdAt: r.createdAt, isCurrent: r.token === token })) });

    } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }); }

  } else {

    const { memListSessions } = await import('@/lib/auth/memory-store');

    const sessions = memListSessions(user.userId);

    // Use the full token as the ID so the individual-session revoke endpoint can match it
    return NextResponse.json({ success: true, sessions: sessions.map(s => ({ id: s.token, deviceInfo: s.deviceInfo, ipAddress: s.ipAddress, location: null, createdAt: new Date(s.expiresAt - 86400000).toISOString(), isCurrent: s.token === token })) });

  }

}



export async function DELETE(req: NextRequest) {

  const user = await getAuthUser(req);

  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const token = req.cookies.get('synkron_session')?.value ?? '';



  if (process.env.DATABASE_URL) {

    try {

      const { revokeAllOtherSessions } = await import('@/lib/auth/session');

      await revokeAllOtherSessions(user.userId, token);

    } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }); }

  } else {

    const { memRevokeAllOtherSessions } = await import('@/lib/auth/memory-store');

    memRevokeAllOtherSessions(user.userId, token);

  }

  return NextResponse.json({ success: true });

}
