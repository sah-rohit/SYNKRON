/**
 * SYNKRON File Editor API
 * GET  /api/editor/files?repoId=&path=  — read a file's current content
 * POST /api/editor/files                — save/update a file draft
 * GET  /api/editor/files/tree?repoId=   — get file tree for a repo
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth/unified';

// In-memory file store (used without DB)
const memFiles = new Map<string, { content: string; updatedAt: string }>(); // `${userId}:${repoId}:${path}` → content

import { zodMsg } from '@/lib/api/zod-error';

const SaveSchema = z.object({
  repositoryId: z.string().min(1),
  filePath: z.string().min(1).max(500),
  content: z.string().max(500_000),
  commitMessage: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get('repoId') ?? '';
  const filePath = searchParams.get('path') ?? '';

  if (!filePath) {
    // Return file tree
    const key = `${user.userId}:${repoId}:`;
    const files: string[] = [];
    for (const k of memFiles.keys()) {
      if (k.startsWith(key)) files.push(k.replace(key, ''));
    }

    if (process.env.DATABASE_URL) {
      try {
        const { getDb, schema } = await import('@/lib/db');
        const { eq } = await import('drizzle-orm');
        const rows = await getDb().select({ filePath: schema.fileEdits.filePath, updatedAt: schema.fileEdits.updatedAt, status: schema.fileEdits.status })
          .from(schema.fileEdits).where(eq(schema.fileEdits.userId, user.userId));
        return NextResponse.json({ success: true, files: rows });
      } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }); }
    }
    return NextResponse.json({ success: true, files: files.map(f => ({ filePath: f, updatedAt: new Date().toISOString(), status: 'draft' })) });
  }

  // Read specific file
  const memKey = `${user.userId}:${repoId}:${filePath}`;
  const memFile = memFiles.get(memKey);

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq, and } = await import('drizzle-orm');
      const [row] = await getDb().select().from(schema.fileEdits)
        .where(and(eq(schema.fileEdits.userId, user.userId), eq(schema.fileEdits.filePath, filePath)))
        .limit(1);
      if (!row) return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
      return NextResponse.json({ success: true, file: row });
    } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }); }
  }

  if (!memFile) return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
  return NextResponse.json({ success: true, file: { filePath, content: memFile.content, updatedAt: memFile.updatedAt, status: 'draft' } });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });

  const { repositoryId, filePath, content, commitMessage } = parsed.data;

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq, and } = await import('drizzle-orm');
      const db = getDb();
      const [existing] = await db.select({ id: schema.fileEdits.id }).from(schema.fileEdits)
        .where(and(eq(schema.fileEdits.userId, user.userId), eq(schema.fileEdits.filePath, filePath), eq(schema.fileEdits.repositoryId, repositoryId))).limit(1);

      if (existing) {
        await db.update(schema.fileEdits).set({ content, commitMessage, updatedAt: new Date() }).where(eq(schema.fileEdits.id, existing.id));
      } else {
        await db.insert(schema.fileEdits).values({ userId: user.userId, repositoryId, filePath, content, commitMessage });
      }
      return NextResponse.json({ success: true });
    } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }); }
  } else {
    const memKey = `${user.userId}:${repositoryId}:${filePath}`;
    memFiles.set(memKey, { content, updatedAt: new Date().toISOString() });
    return NextResponse.json({ success: true });
  }
}
