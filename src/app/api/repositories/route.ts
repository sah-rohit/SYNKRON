/**
 * GET  /api/repositories  — list user repos
 * POST /api/repositories  — connect new repo
 * Works with DB or in-memory store.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth/unified';

// ── In-memory repo store — survives Fast Refresh via globalThis ───────────────
declare global {
  // eslint-disable-next-line no-var
  var __synkron_repos: Map<string, any[]> | undefined;
}
const memRepos: Map<string, any[]> = (globalThis.__synkron_repos ??= new Map());

function memGetRepos(userId: string) { return memRepos.get(userId) ?? []; }
function memAddRepo(userId: string, repo: any) {
  const list = [...memGetRepos(userId)];
  list.push(repo);
  memRepos.set(userId, list);
}

const ConnectSchema = z.object({
  fullName: z.string().transform(val => {
    let trimmed = val.trim();
    trimmed = trimmed.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
    trimmed = trimmed.replace(/^github\.com\//i, '');
    trimmed = trimmed.replace(/\.git$/i, '');
    trimmed = trimmed.replace(/\/$/, ''); // Remove trailing slash
    return trimmed;
  }).pipe(z.string().regex(/^[\w.\-]+\/[\w.\-]+$/, 'Must be in owner/repo format (e.g. facebook/react)')),
  branch: z.string().min(1).max(100).default('main'),
});

/** Flatten Zod field errors into a single readable string */
function zodErrorMessage(err: z.ZodError): string {
  const fields = err.flatten().fieldErrors;
  const messages = Object.entries(fields)
    .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
    .join(' | ');
  return messages || 'Validation failed';
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq } = await import('drizzle-orm');
      const repos = await getDb()
        .select({
          id: schema.repositories.id,
          fullName: schema.repositories.fullName,
          branch: schema.repositories.branch,
          isActive: schema.repositories.isActive,
          lastSyncedAt: schema.repositories.lastSyncedAt,
          createdAt: schema.repositories.createdAt,
        })
        .from(schema.repositories)
        .where(eq(schema.repositories.userId, user.userId));
      return NextResponse.json({ success: true, repositories: repos });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, repositories: memGetRepos(user.userId) });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ConnectSchema.safeParse(body);
  if (!parsed.success) {
    // Return a plain string, never an object — prevents [object Object] in the UI
    return NextResponse.json({ success: false, error: zodErrorMessage(parsed.error) }, { status: 422 });
  }

  const webhookSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const webhookUrl = `${req.nextUrl.origin}/api/webhook`;

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq, and } = await import('drizzle-orm');
      const db = getDb();

      const existing = await db
        .select({ id: schema.repositories.id })
        .from(schema.repositories)
        .where(and(
          eq(schema.repositories.userId, user.userId),
          eq(schema.repositories.fullName, parsed.data.fullName),
        ))
        .limit(1);

      if (existing.length) {
        return NextResponse.json({ success: false, error: 'Repository already connected' }, { status: 409 });
      }

      const [repo] = await db
        .insert(schema.repositories)
        .values({ userId: user.userId, fullName: parsed.data.fullName, branch: parsed.data.branch, webhookSecret })
        .returning();

      return NextResponse.json({
        success: true,
        repository: { id: repo.id, fullName: repo.fullName, branch: repo.branch, webhookSecret, webhookUrl },
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // ── In-memory path ────────────────────────────────────────────────────────
  const existing = memGetRepos(user.userId).find(r => r.fullName === parsed.data.fullName);
  if (existing) {
    return NextResponse.json({ success: false, error: 'Repository already connected' }, { status: 409 });
  }

  const repo = {
    id: crypto.randomUUID(),
    userId: user.userId,
    fullName: parsed.data.fullName,
    branch: parsed.data.branch,
    webhookSecret,
    isActive: true,
    lastSyncedAt: null,
    createdAt: new Date().toISOString(),
  };
  memAddRepo(user.userId, repo);

  return NextResponse.json({
    success: true,
    repository: { ...repo, webhookUrl },
  });
}

