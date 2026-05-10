/**
 * Rotate Webhook Secret
 * POST /api/repositories/:id/webhook-secret
 *
 * Generates a new HMAC-SHA256 webhook secret for a repository.
 * The old secret is immediately invalidated.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.cookies.get('ostinato_session')?.value;
  if (!token) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  if (!process.env.DATABASE_URL) {
    const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return NextResponse.json({ success: true, webhookSecret: newSecret, note: 'Demo mode — not persisted' });
  }

  try {
    const { validateSession } = await import('@/lib/auth/session');
    const { getDb, schema } = await import('@/lib/db');
    const { eq, and } = await import('drizzle-orm');

    const session = await validateSession(token);
    if (!session) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });

    const db = getDb();
    const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const updated = await db
      .update(schema.repositories)
      .set({ webhookSecret: newSecret })
      .where(and(eq(schema.repositories.id, id), eq(schema.repositories.userId, session.userId)))
      .returning({ id: schema.repositories.id });

    if (!updated.length) return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      webhookSecret: newSecret,
      warning: 'Update this secret in your GitHub webhook settings immediately. The old secret is now invalid.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
