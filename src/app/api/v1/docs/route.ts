/**
 * Ostinato Docs API
 * GET /api/v1/docs?repositoryId=<id>
 * Returns all healed documentation files for a repository.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repositoryId = searchParams.get('repositoryId');

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: true,
      docs: getDemoDocs(),
      note: 'Demo mode: Configure DATABASE_URL for real data',
    });
  }

  try {
    const { getDb, schema } = await import('@/lib/db');
    const { eq } = await import('drizzle-orm');
    const db = getDb();

    const query = repositoryId
      ? db.select().from(schema.docFiles).where(eq(schema.docFiles.repositoryId, repositoryId))
      : db.select().from(schema.docFiles);

    const docs = await query;

    return NextResponse.json({ success: true, docs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

function getDemoDocs() {
  return [
    {
      id: 'demo-1',
      filePath: 'src/auth/session.ts',
      language: 'typescript',
      healCount: 3,
      lastHealedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      lastHealedBy: 'Groq llama-3.3-70b-versatile',
    },
    {
      id: 'demo-2',
      filePath: 'src/config/database.ts',
      language: 'typescript',
      healCount: 1,
      lastHealedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      lastHealedBy: 'Groq llama-3.3-70b-versatile',
    },
  ];
}
