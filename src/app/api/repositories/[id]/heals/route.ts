/**
 * SYNKRON Heal History
 * GET /api/repositories/:id/heals
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.cookies.get('synkron_session')?.value;
  if (!token) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: true,
      heals: getDemoHeals(),
      note: 'Demo mode',
    });
  }

  try {
    const { validateSession } = await import('@/lib/auth/session');
    const { getDb, schema } = await import('@/lib/db');
    const { eq, and, desc } = await import('drizzle-orm');

    const session = await validateSession(token);
    if (!session) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });

    const db = getDb();

    // Verify repo belongs to user
    const [repo] = await db
      .select({ id: schema.repositories.id })
      .from(schema.repositories)
      .where(and(eq(schema.repositories.id, id), eq(schema.repositories.userId, session.userId)))
      .limit(1);

    if (!repo) return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });

    const heals = await db
      .select()
      .from(schema.healEvents)
      .where(eq(schema.healEvents.repositoryId, id))
      .orderBy(desc(schema.healEvents.createdAt))
      .limit(50);

    return NextResponse.json({ success: true, heals });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function getDemoHeals() {
  return [
    { id: '1', triggerType: 'webhook', commitMessage: 'Refactor token storage lifespan', modelUsed: 'Groq llama-3.3-70b-versatile', status: 'success', durationMs: 1240, createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
    { id: '2', triggerType: 'manual', commitMessage: 'Manual heal: session.ts', modelUsed: 'Groq llama-3.3-70b-versatile', status: 'success', durationMs: 980, createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
    { id: '3', triggerType: 'webhook', commitMessage: 'Add retry logic to connectDB', modelUsed: 'OpenAI gpt-4o-mini (fallback)', status: 'success', durationMs: 2100, createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  ];
}
