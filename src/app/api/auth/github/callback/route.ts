/**
 * GitHub OAuth — Step 2: Callback
 * GET /api/auth/github/callback
 * 
 * Exchanges the authorization code for an access token,
 * fetches the user profile from GitHub, creates or finds the user
 * in the database, and sets the session cookie.
 */
import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth/unified';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/?auth_error=no_code', req.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?auth_error=missing_config', req.url));
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.redirect(
        new URL(`/?auth_error=${tokenData.error || 'token_exchange_failed'}`, req.url)
      );
    }

    const accessToken = tokenData.access_token;

    // Fetch GitHub user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    const ghUser = await userRes.json();

    // Fetch primary email
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    const emails: Array<{ email: string; primary: boolean; verified: boolean }> = await emailsRes.json();
    const primaryEmail = emails.find(e => e.primary && e.verified)?.email || emails[0]?.email || `${ghUser.login}@github.com`;

    // Create or find user, create session
    const USE_DB = !!process.env.DATABASE_URL;

    let userId: string;
    let sessionToken: string;
    const username = ghUser.login || 'github-user';
    const fullName = ghUser.name || username;

    if (USE_DB) {
      const { getDb, schema } = await import('@/lib/db');
      const { eq } = await import('drizzle-orm');
      const db = getDb();

      // Check if user exists
      const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, primaryEmail))
        .limit(1);

      if (existing.length > 0) {
        userId = existing[0].id;
        // Update avatar if changed
        await db.update(schema.users)
          .set({ avatarUrl: ghUser.avatar_url, updatedAt: new Date() })
          .where(eq(schema.users.id, userId));
      } else {
        // Create new user
        const inserted = await db.insert(schema.users).values({
          username,
          email: primaryEmail,
          fullName,
          passwordHash: 'github-oauth', // No password for OAuth users
          avatarUrl: ghUser.avatar_url,
        }).returning({ id: schema.users.id });
        userId = inserted[0].id;
      }

      // Create session
      const { createSession } = await import('@/lib/auth/session');
      sessionToken = await createSession(userId, 'GitHub OAuth', req.headers.get('x-forwarded-for') || undefined);
    } else {
      // In-memory fallback
      const memStore = await import('@/lib/auth/memory-store');
      let user = memStore.memGetUserByEmail(primaryEmail);
      if (!user) {
        user = memStore.memCreateUser({
          username,
          email: primaryEmail,
          fullName,
          passwordHash: 'github-oauth-noop',
          plan: 'free',
          avatarUrl: ghUser.avatar_url || null,
        });
      }
      userId = user.id;
      sessionToken = memStore.memCreateSession(userId, 'GitHub OAuth');
    }

    // Redirect to home — session cookie is set, client will call /api/auth/me to get user data
    const redirectUrl = new URL('/?auth_success=true', req.url);

    const response = NextResponse.redirect(redirectUrl);
    setSessionCookie(response, sessionToken);
    return response;
  } catch (err: any) {
    console.error('[GitHub OAuth] Error:', err);
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(err.message)}`, req.url));
  }
}
