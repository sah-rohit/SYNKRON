/**
 * GitHub Repository Validator
 * GET /api/github/validate?repo=owner/name
 *
 * Checks that a repository exists on GitHub and returns its metadata
 * (default branch, visibility, description) before the user connects it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/unified';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const repo = req.nextUrl.searchParams.get('repo')?.trim();
  if (!repo || !/^[\w.\-]+\/[\w.\-]+$/.test(repo)) {
    return NextResponse.json({ success: false, error: 'Invalid repo format. Use owner/name.' }, { status: 400 });
  }

  const token =
    req.headers.get('x-github-token') ||
    process.env.GITHUB_TOKEN ||
    '';

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'SYNKRON-App',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });

    if (res.status === 404) {
      return NextResponse.json(
        { success: false, error: `Repository "${repo}" not found. Check the name and make sure it's public (or provide a token for private repos).` },
        { status: 404 }
      );
    }
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { success: false, error: 'Access denied. This may be a private repository — provide a GitHub token with repo scope.' },
        { status: 403 }
      );
    }
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `GitHub API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      repo: {
        full_name: data.full_name,
        description: data.description,
        private: data.private,
        default_branch: data.default_branch,
        language: data.language,
        stargazers_count: data.stargazers_count,
        html_url: data.html_url,
        updated_at: data.updated_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
