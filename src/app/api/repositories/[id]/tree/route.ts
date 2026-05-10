import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/unified';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  let repoFullName = '';
  let branch = 'main';

  // Support both Database and In-memory repos
  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq, and } = await import('drizzle-orm');
      const db = getDb();
      const repos = await db
        .select({ fullName: schema.repositories.fullName, branch: schema.repositories.branch })
        .from(schema.repositories)
        .where(and(eq(schema.repositories.id, id), eq(schema.repositories.userId, user.userId)))
        .limit(1);

      if (!repos.length) return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
      repoFullName = repos[0].fullName;
      branch = repos[0].branch;
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  } else {
    // @ts-ignore
    const memRepos = globalThis.__synkron_repos?.get(user.userId) || [];
    const repo = memRepos.find((r: any) => r.id === id);
    if (!repo) return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
    repoFullName = repo.fullName;
    branch = repo.branch;
  }

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'SYNKRON-App',
    };
    // Use auth token if available to prevent rate limits
    if (process.env.GITHUB_CLIENT_SECRET) {
       // Basic auth for server-to-server rate limit increase (optional)
       // Or if there's a personal access token we could use it here.
    }

    let targetBranch = branch || 'main';
    let res = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/${targetBranch}?recursive=1`, { headers });

    // Fallback to auto-detecting default branch if 404 (e.g., 'master' instead of 'main')
    if (res.status === 404 || res.status === 409) {
      const repoInfoRes = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers });
      if (repoInfoRes.ok) {
        const repoData = await repoInfoRes.json();
        targetBranch = repoData.default_branch;
        res = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/${targetBranch}?recursive=1`, { headers });
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch tree from GitHub');
    }

    const data = await res.json();
    return NextResponse.json({ success: true, tree: data.tree });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
