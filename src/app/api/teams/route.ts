/**
 * Team Workspaces API
 * GET /api/teams — List teams for current user
 * POST /api/teams — Create a new team
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/unified';

declare global {
  // eslint-disable-next-line no-var
  var __ostinato_teams: Map<string, any[]> | undefined;
}
const memTeams: Map<string, any[]> = (globalThis.__ostinato_teams ??= new Map());

function memGetTeams(userId: string) { return memTeams.get(userId) ?? []; }
function memAddTeam(userId: string, team: any) {
  const list = [...memGetTeams(userId)];
  list.push(team);
  memTeams.set(userId, list);
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const { eq } = await import('drizzle-orm');
      const db = getDb();

      const memberships = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.userId, user.userId));
      const teamIds = memberships.map(m => m.teamId);
      
      if (!teamIds.length) return NextResponse.json({ success: true, teams: [] });

      const teams = [];
      for (const tid of teamIds) {
        const t = await db.select().from(schema.teams).where(eq(schema.teams.id, tid)).limit(1);
        const members = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.teamId, tid));
        if (t.length) teams.push({ ...t[0], members, myRole: memberships.find(m => m.teamId === tid)?.role });
      }

      return NextResponse.json({ success: true, teams });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, teams: memGetTeams(user.userId) });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ success: false, error: 'Team name is required' }, { status: 400 });

  if (process.env.DATABASE_URL) {
    try {
      const { getDb, schema } = await import('@/lib/db');
      const db = getDb();

      const inserted = await db.insert(schema.teams).values({ name, ownerId: user.userId }).returning();
      const team = inserted[0];

      await db.insert(schema.teamMembers).values({ teamId: team.id, userId: user.userId, role: 'owner' });

      return NextResponse.json({ success: true, team });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  const newTeam = {
    id: crypto.randomUUID(),
    name,
    ownerId: user.userId,
    createdAt: new Date().toISOString(),
    members: [{ userId: user.userId, role: 'owner' }],
    myRole: 'owner'
  };
  memAddTeam(user.userId, newTeam);

  return NextResponse.json({ success: true, team: newTeam });
}
