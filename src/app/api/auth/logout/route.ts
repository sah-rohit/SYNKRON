import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/unified';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('ostinato_session')?.value;
  if (token) {
    if (process.env.DATABASE_URL) {
      try { const { revokeSession } = await import('@/lib/auth/session'); await revokeSession(token); } catch {}
    } else {
      const { memRevokeSession } = await import('@/lib/auth/memory-store');
      memRevokeSession(token);
    }
  }
  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}
