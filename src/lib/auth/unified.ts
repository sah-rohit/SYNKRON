/**
 * Ostinato Unified Auth
 *
 * Single entry point for all auth operations.
 * Automatically uses Neon DB when DATABASE_URL is set,
 * falls back to the in-memory store otherwise.
 * This means the app works fully out of the box with zero config.
 */
import { NextRequest, NextResponse } from 'next/server';

const USE_DB = () => !!process.env.DATABASE_URL;

// ─── Session validation ───────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  plan: string;
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get('ostinato_session')?.value;
  if (!token) return null;

  if (USE_DB()) {
    try {
      const { validateSession } = await import('./session');
      return await validateSession(token);
    } catch {
      return null;
    }
  } else {
    const { memValidateSession, memGetUserById } = await import('./memory-store');
    const sess = memValidateSession(token);
    if (!sess) return null;
    const user = memGetUserById(sess.userId);
    if (!user) return null;
    return { userId: user.id, username: user.username, email: user.email, plan: user.plan };
  }
}

export function requireAuth(handler: (req: NextRequest, user: AuthUser, ...args: any[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: any[]) => {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    return handler(req, user, ...args);
  };
}

// ─── Cookie helper ────────────────────────────────────────────────────────────

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set('ostinato_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 h
    path: '/',
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set('ostinato_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
