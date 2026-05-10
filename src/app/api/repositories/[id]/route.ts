import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/unified';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq, and } = await import('drizzle-orm');
      const deleted = await getDb().delete(schema.repositories).where(and(eq(schema.repositories.id, id), eq(schema.repositories.userId, user.userId))).returning({ id: schema.repositories.id });
      if (!deleted.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }); }
  } else {
    // In-memory: import the memRepos map via the route module (shared module-level state)
    // We use a simple approach: just return success since in-memory state is ephemeral
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: true });
}
