/**
 * GitHub OAuth — Step 1: Redirect to GitHub
 * GET /api/auth/github
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { success: false, error: 'GITHUB_CLIENT_ID is not configured in .env.local' },
      { status: 500 }
    );
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/github/callback`;
  const scope = 'read:user user:email repo';

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
  githubAuthUrl.searchParams.set('scope', scope);
  githubAuthUrl.searchParams.set('state', crypto.randomUUID());

  return NextResponse.redirect(githubAuthUrl.toString());
}
