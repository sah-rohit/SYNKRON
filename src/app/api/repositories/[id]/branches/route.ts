/**
 * Repository Branch Management
 * GET  /api/repositories/:id/branches  — list branches
 * POST /api/repositories/:id/branches  — add/update a branch
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { zodMsg } from '@/lib/api/zod-error';

const BranchSchema = z.object({
  name: z.string().min(1).max(255),
  isDefault: z.boolean().optional().default(false),
  isProtected: z.boolean().optional().default(false),
});

async function getAuthedRepo(req: NextRequest, repoId: string) {
  const token = req.cookies.get('synkron_session')?.value;
  if (!token) return null;
  if (!process.env.DATABASE_URL) return { demo: true };

  const { validateSession } = await import('@/lib/auth/session');
  const { getDb, schema } = await import('@/lib/db');
  const { eq, and } = await import('drizzle-orm');

  const session = await validateSession(token);
  if (!session) return null;

  const db = getDb();
  const [repo] = await db
    .select({ id: schema.repositories.id })
    .from(schema.repositories)
    .where(and(eq(schema.repositories.id, repoId), eq(schema.repositories.userId, session.userId)))
    .limit(1);

  return repo ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getAuthedRepo(req, id);
  if (!repo) return NextResponse.json({ success: false, error: 'Not found or not authenticated' }, { status: 404 });

  if ((repo as any).demo) {
    return NextResponse.json({ success: true, branches: [
      { id: '1', name: 'main', isDefault: true, isProtected: true, lastCommitSha: null, lastCommitMessage: null },
      { id: '2', name: 'develop', isDefault: false, isProtected: false, lastCommitSha: null, lastCommitMessage: null },
    ], note: 'Demo mode' });
  }

  const { getDb, schema } = await import('@/lib/db');
  const { eq } = await import('drizzle-orm');
  const db = getDb();
  const branches = await db.select().from(schema.repoBranches).where(eq(schema.repoBranches.repositoryId, id));
  return NextResponse.json({ success: true, branches });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getAuthedRepo(req, id);
  if (!repo) return NextResponse.json({ success: false, error: 'Not found or not authenticated' }, { status: 404 });

  if ((repo as any).demo) return NextResponse.json({ success: true, note: 'Demo mode' });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = BranchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });

  const { getDb, schema } = await import('@/lib/db');
  const db = getDb();

  // If setting as default, unset others
  if (parsed.data.isDefault) {
    const { eq } = await import('drizzle-orm');
    await db.update(schema.repoBranches).set({ isDefault: false }).where(eq(schema.repoBranches.repositoryId, id));
  }

  const [branch] = await db.insert(schema.repoBranches).values({ repositoryId: id, ...parsed.data }).returning();
  return NextResponse.json({ success: true, branch });
}
