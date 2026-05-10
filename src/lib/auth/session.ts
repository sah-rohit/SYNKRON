/**
 * Ostinato Session Management
 * Stateless JWT-like sessions stored in the database.
 * Uses crypto.randomUUID() for token generation (no external deps).
 */
import { getDb, schema } from '@/lib/db';
import { eq, and, gt } from 'drizzle-orm';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
  plan: string;
}

/**
 * Create a new session for a user and persist it to the database.
 */
export async function createSession(
  userId: string,
  deviceInfo?: string,
  ipAddress?: string,
  location?: string
): Promise<string> {
  const db = getDb();
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(schema.sessions).values({
    userId,
    token,
    deviceInfo,
    ipAddress,
    location,
    expiresAt,
  });

  return token;
}

/**
 * Validate a session token and return the associated user.
 * Returns null if the token is invalid or expired.
 */
export async function validateSession(token: string): Promise<SessionPayload | null> {
  if (!token) return null;

  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({
      userId: schema.sessions.userId,
      expiresAt: schema.sessions.expiresAt,
      username: schema.users.username,
      email: schema.users.email,
      plan: schema.users.plan,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(
      and(
        eq(schema.sessions.token, token),
        gt(schema.sessions.expiresAt, now)
      )
    )
    .limit(1);

  if (!rows.length) return null;

  const row = rows[0];
  return {
    userId: row.userId,
    username: row.username,
    email: row.email,
    plan: row.plan,
  };
}

/**
 * Revoke a specific session token.
 */
export async function revokeSession(token: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
}

/**
 * Revoke all sessions for a user except the current one.
 */
export async function revokeAllOtherSessions(userId: string, currentToken: string): Promise<void> {
  const db = getDb();
  const allSessions = await db
    .select({ id: schema.sessions.id, token: schema.sessions.token })
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, userId));

  const toRevoke = allSessions.filter((s) => s.token !== currentToken);
  for (const s of toRevoke) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, s.id));
  }
}

/**
 * Get the session token from the request cookies.
 */
export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/ostinato_session=([^;]+)/);
  return match ? match[1] : null;
}
