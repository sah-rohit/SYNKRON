/**
 * GitHub Repository Proxy
 * GET /api/github/repos?q=&page=&per_page=
 *
 * Proxies GitHub API calls server-side so the PAT never appears in
 * browser network requests. The token is read from the session-scoped
 * header or from a server-side env var.
 *
 * Priority:
 *   1. X-GitHub-Token request header (sent by the client after the user
 *      enters their PAT in the UI — the header is stripped by the browser
 *      same-origin policy so it never leaks to third parties)
 *   2. GITHUB_TOKEN env var (set by the operator)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/unified';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const token =
    req.headers.get('x-github-token') ||
    process.env.GITHUB_TOKEN ||
    '';

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'No GitHub token available. Provide a Personal Access Token.' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const page = searchParams.get('page') ?? '1';
  const perPage = Math.min(parseInt(searchParams.get('per_page') ?? '30'), 100);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SYNKRON-App',
    };

    let url: string;
    if (q) {
      // Search across all repos the user has access to
      url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q + ' user:@me')}&sort=updated&per_page=${perPage}&page=${page}`;
    } else {
      // List the authenticated user's repos
      url = `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member`;
    }

    const res = await fetch(url, { headers });

    if (res.status === 401) {
      return NextResponse.json(
        { success: false, error: 'GitHub token is invalid or expired. Generate a new one at github.com/settings/tokens.' },
        { status: 401 }
      );
    }
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        const reset = res.headers.get('x-ratelimit-reset');
        const resetTime = reset ? new Date(parseInt(reset) * 1000).toLocaleTimeString() : 'soon';
        return NextResponse.json(
          { success: false, error: `GitHub rate limit exceeded. Resets at ${resetTime}.` },
          { status: 429 }
        );
      }
      return NextResponse.json({ success: false, error: 'GitHub API forbidden.' }, { status: 403 });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.message || `GitHub API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const repos = q ? (data.items ?? []) : data;

    // Return only the fields the UI needs
    const slim = repos.map((r: any) => ({
      id: r.id,
      full_name: r.full_name,
      name: r.name,
      description: r.description,
      private: r.private,
      default_branch: r.default_branch,
      stargazers_count: r.stargazers_count,
      language: r.language,
      updated_at: r.updated_at,
      html_url: r.html_url,
    }));

    return NextResponse.json({
      success: true,
      repos: slim,
      total: q ? data.total_count : slim.length,
      rateLimit: {
        remaining: parseInt(res.headers.get('x-ratelimit-remaining') ?? '60'),
        limit: parseInt(res.headers.get('x-ratelimit-limit') ?? '60'),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
