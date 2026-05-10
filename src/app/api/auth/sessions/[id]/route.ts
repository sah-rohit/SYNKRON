/**
 * Ostinato Revoke Specific Session
 * DELETE /api/auth/sessions/:id
 */
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.cookies.get('ostinato_session')?.value;
  if (!token) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: true, note: 'Demo mode' });
  }

  try {
    const { validateSession } = await import('@/lib/auth/session');
    const { getDb, schema } = await import('@/lib/db');
    const { eq, and } = await import('drizzle-orm');

    const session = await validateSession(token);
    if (!session) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });

    const db = getDb();

    // Ensure the session belongs to this user and is not the current session
    const [target] = await db
      .select({ id: schema.sessions.id, token: schema.sessions.token })
      .from(schema.sessions)
      .where(and(eq(schema.sessions.id, id), eq(schema.sessions.userId, session.userId)))
      .limit(1);

    if (!target) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    if (target.token === token) return NextResponse.json({ success: false, error: 'Cannot revoke your current session. Use logout instead.' }, { status: 400 });

    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
