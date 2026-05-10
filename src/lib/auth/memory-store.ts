/**
 * Ostinato In-Memory Session + User Store
 *
 * Works when DATABASE_URL is not configured.
 * Uses globalThis to persist data across Next.js Fast Refresh HMR cycles.
 * In production with a real DB this module is bypassed entirely.
 */

export interface MemUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  plan: 'free' | 'pro' | 'enterprise';
  avatarUrl: string | null;
  createdAt: string;
}

export interface MemSession {
  token: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  expiresAt: number; // unix ms
}

// ── Persist across HMR by attaching to globalThis ─────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __ostinato_users: Map<string, MemUser> | undefined;
  // eslint-disable-next-line no-var
  var __ostinato_usersByEmail: Map<string, string> | undefined;
  // eslint-disable-next-line no-var
  var __ostinato_usersByUsername: Map<string, string> | undefined;
  // eslint-disable-next-line no-var
  var __ostinato_sessions: Map<string, MemSession> | undefined;
  // eslint-disable-next-line no-var
  var __ostinato_aiUsage: Map<string, { count: number; weekStart: number }> | undefined;
}

const users: Map<string, MemUser> =
  (globalThis.__ostinato_users ??= new Map());
const usersByEmail: Map<string, string> =
  (globalThis.__ostinato_usersByEmail ??= new Map());
const usersByUsername: Map<string, string> =
  (globalThis.__ostinato_usersByUsername ??= new Map());
const sessions: Map<string, MemSession> =
  (globalThis.__ostinato_sessions ??= new Map());
const aiUsage: Map<string, { count: number; weekStart: number }> =
  (globalThis.__ostinato_aiUsage ??= new Map());

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// ─── Users ────────────────────────────────────────────────────────────────────

export function memCreateUser(user: Omit<MemUser, 'id' | 'createdAt'>): MemUser {
  const id = crypto.randomUUID();
  const full: MemUser = { ...user, id, createdAt: new Date().toISOString() };
  users.set(id, full);
  usersByEmail.set(user.email.toLowerCase(), id);
  usersByUsername.set(user.username.toLowerCase(), id);
  return full;
}

export function memGetUserByEmail(email: string): MemUser | undefined {
  const id = usersByEmail.get(email.toLowerCase());
  return id ? users.get(id) : undefined;
}

export function memGetUserByUsername(username: string): MemUser | undefined {
  const id = usersByUsername.get(username.toLowerCase());
  return id ? users.get(id) : undefined;
}

export function memGetUserById(id: string): MemUser | undefined {
  return users.get(id);
}

export function memUpdateUser(id: string, patch: Partial<MemUser>): MemUser | undefined {
  const u = users.get(id);
  if (!u) return undefined;
  const updated = { ...u, ...patch };
  users.set(id, updated);
  return updated;
}

export function memDeleteUser(id: string): void {
  const u = users.get(id);
  if (!u) return;
  usersByEmail.delete(u.email.toLowerCase());
  usersByUsername.delete(u.username.toLowerCase());
  users.delete(id);
  // Cascade: delete all sessions for this user
  for (const [token, sess] of sessions) {
    if (sess.userId === id) sessions.delete(token);
  }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function memCreateSession(userId: string, deviceInfo = '', ipAddress = ''): string {
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  sessions.set(token, {
    token,
    userId,
    deviceInfo,
    ipAddress,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

export function memValidateSession(token: string): MemSession | null {
  const sess = sessions.get(token);
  if (!sess) return null;
  if (Date.now() > sess.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return sess;
}

export function memRevokeSession(token: string): void {
  sessions.delete(token);
}

export function memRevokeAllOtherSessions(userId: string, currentToken: string): void {
  for (const [token, sess] of sessions) {
    if (sess.userId === userId && token !== currentToken) {
      sessions.delete(token);
    }
  }
}

export function memListSessions(userId: string): MemSession[] {
  const now = Date.now();
  const result: MemSession[] = [];
  for (const sess of sessions.values()) {
    if (sess.userId === userId && sess.expiresAt > now) result.push(sess);
  }
  return result;
}

// ─── Weekly AI Usage ──────────────────────────────────────────────────────────

function getWeekStart(): number {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const diff = now.getUTCDate() - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff)).getTime();
}

export function memCheckAndIncrementAIUsage(
  fingerprint: string,
  weeklyLimit: number
): { allowed: boolean; used: number; limit: number; resetsAt: string } {
  const weekStart = getWeekStart();
  const entry = aiUsage.get(fingerprint);

  if (!entry || entry.weekStart < weekStart) {
    // New week — reset
    aiUsage.set(fingerprint, { count: 1, weekStart });
    return { allowed: true, used: 1, limit: weeklyLimit, resetsAt: new Date(weekStart + 7 * 86400000).toISOString() };
  }

  if (entry.count >= weeklyLimit) {
    return { allowed: false, used: entry.count, limit: weeklyLimit, resetsAt: new Date(weekStart + 7 * 86400000).toISOString() };
  }

  entry.count++;
  return { allowed: true, used: entry.count, limit: weeklyLimit, resetsAt: new Date(weekStart + 7 * 86400000).toISOString() };
}

export function memGetAIUsage(fingerprint: string, weeklyLimit: number) {
  const weekStart = getWeekStart();
  const entry = aiUsage.get(fingerprint);
  if (!entry || entry.weekStart < weekStart) {
    return { used: 0, limit: weeklyLimit, resetsAt: new Date(weekStart + 7 * 86400000).toISOString() };
  }
  return { used: entry.count, limit: weeklyLimit, resetsAt: new Date(weekStart + 7 * 86400000).toISOString() };
}
