import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/unified';
import { z } from 'zod';

const CommitSchema = z.object({
  filePath: z.string().min(1),
  content: z.string(),
  commitMessage: z.string().min(1),
  githubToken: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }
  
  const parsed = CommitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422 });
  const { filePath, content, commitMessage, githubToken } = parsed.data;

  let repoFullName = '';
  let branch = 'main';

  // Fetch repo info
  if (process.env.DATABASE_URL) {
    const { getDb, schema } = await import('@/lib/db');
    const { eq, and } = await import('drizzle-orm');
    const db = getDb();
    const repos = await db.select({ fullName: schema.repositories.fullName, branch: schema.repositories.branch })
      .from(schema.repositories).where(and(eq(schema.repositories.id, id), eq(schema.repositories.userId, user.userId))).limit(1);
    if (!repos.length) return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
    repoFullName = repos[0].fullName;
    branch = repos[0].branch;
  } else {
    // @ts-ignore
    const memRepos = globalThis.__ostinato_repos?.get(user.userId) || [];
    const repo = memRepos.find((r: any) => r.id === id);
    if (!repo) return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
    repoFullName = repo.fullName;
    branch = repo.branch;
  }

  try {
    const tokenToUse = githubToken || process.env.GITHUB_TOKEN || process.env.GITHUB_CLIENT_SECRET;
    if (!tokenToUse) {
      return NextResponse.json({ success: false, error: 'GitHub Personal Access Token is required to commit files. Set it in Settings or Environment.' }, { status: 401 });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Ostinato-App',
      'Authorization': `Bearer ${tokenToUse}`
    };

    let targetBranch = branch || 'main';

    // 1. Get the current file SHA (needed for update)
    let sha = '';
    let fileRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${targetBranch}`, { headers });

    // Fallback to auto-detecting default branch if 404 (e.g., 'master' instead of 'main')
    if (fileRes.status === 404 && targetBranch === 'main') {
      const repoInfoRes = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers });
      if (repoInfoRes.ok) {
        const repoData = await repoInfoRes.json();
        targetBranch = repoData.default_branch;
        fileRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${targetBranch}`, { headers });
      }
    }

    if (fileRes.ok) {
      const fileData = await fileRes.json();
      sha = fileData.sha;
    }

    // 2. Commit the file
    const commitRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(content).toString('base64'),
        branch: targetBranch,
        ...(sha ? { sha } : {})
      })
    });

    if (!commitRes.ok) {
      const errData = await commitRes.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to commit to GitHub');
    }

    return NextResponse.json({ success: true, message: `Successfully committed to ${targetBranch}` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('filePath');
  const commitMessage = searchParams.get('commitMessage') || `Delete ${filePath}`;
  const githubToken = req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!filePath) return NextResponse.json({ success: false, error: 'filePath is required' }, { status: 400 });

  let repoFullName = '';
  let branch = 'main';

  if (process.env.DATABASE_URL) {
    const { getDb, schema } = await import('@/lib/db');
    const { eq, and } = await import('drizzle-orm');
    const db = getDb();
    const repos = await db.select({ fullName: schema.repositories.fullName, branch: schema.repositories.branch })
      .from(schema.repositories).where(and(eq(schema.repositories.id, id), eq(schema.repositories.userId, user.userId))).limit(1);
    if (!repos.length) return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
    repoFullName = repos[0].fullName;
    branch = repos[0].branch;
  } else {
    // @ts-ignore
    const memRepos = globalThis.__ostinato_repos?.get(user.userId) || [];
    const repo = memRepos.find((r: any) => r.id === id);
    if (!repo) return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
    repoFullName = repo.fullName;
    branch = repo.branch;
  }

  try {
    const tokenToUse = githubToken || process.env.GITHUB_TOKEN || process.env.GITHUB_CLIENT_SECRET;
    if (!tokenToUse) return NextResponse.json({ success: false, error: 'GitHub PAT is required' }, { status: 401 });

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Ostinato-App',
      'Authorization': `Bearer ${tokenToUse}`
    };

    let targetBranch = branch || 'main';
    let sha = '';
    let fileRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${targetBranch}`, { headers });

    if (fileRes.status === 404 && targetBranch === 'main') {
      const repoInfoRes = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers });
      if (repoInfoRes.ok) {
        const repoData = await repoInfoRes.json();
        targetBranch = repoData.default_branch;
        fileRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${targetBranch}`, { headers });
      }
    }

    if (!fileRes.ok) throw new Error('File not found on GitHub to delete');
    const fileData = await fileRes.json();
    sha = fileData.sha;

    const commitRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ message: commitMessage, sha, branch: targetBranch })
    });

    if (!commitRes.ok) throw new Error('Failed to delete file on GitHub');
    return NextResponse.json({ success: true, message: `Deleted ${filePath}` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
