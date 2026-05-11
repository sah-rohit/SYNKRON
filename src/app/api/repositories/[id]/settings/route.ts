/**

 * Repository Settings

 * GET   /api/repositories/:id/settings  — get settings

 * PATCH /api/repositories/:id/settings  — update settings

 */

import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';



import { zodMsg } from '@/lib/api/zod-error';



const SettingsSchema = z.object({

  branch: z.string().min(1).max(255).optional(),

  isActive: z.boolean().optional(),

  // Note: autoHealOnPush and notifyOnHeal are UI-only preferences not yet in the DB schema

});



async function getAuthedRepo(req: NextRequest, repoId: string) {

  const token = req.cookies.get('synkron_session')?.value;

  if (!token) return null;

  if (!process.env.DATABASE_URL) return { demo: true };



  const { validateSession } = await import('@/lib/auth/session');

  const { getDb, schema } = await import('@/lib/db');

  const { eq, and } = await import('drizzle-orm');



  const session = await validateSession(token);

  if (!session) return null;



  const db = getDb();

  const [repo] = await db

    .select()

    .from(schema.repositories)

    .where(and(eq(schema.repositories.id, repoId), eq(schema.repositories.userId, session.userId)))

    .limit(1);



  return repo ?? null;

}



export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const { id } = await params;

  const repo = await getAuthedRepo(req, id);

  if (!repo) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });



  if ((repo as any).demo) {

    return NextResponse.json({ success: true, settings: { branch: 'main', isActive: true }, note: 'Demo mode' });

  }



  return NextResponse.json({ success: true, settings: repo });

}



export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const { id } = await params;

  const repo = await getAuthedRepo(req, id);

  if (!repo) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });



  if ((repo as any).demo) return NextResponse.json({ success: true, note: 'Demo mode' });



  let body: unknown;

  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }



  const parsed = SettingsSchema.safeParse(body);

  if (!parsed.success) return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });



  const { getDb, schema } = await import('@/lib/db');

  const { eq } = await import('drizzle-orm');

  const db = getDb();



  const [updated] = await db

    .update(schema.repositories)

    .set(parsed.data)

    .where(eq(schema.repositories.id, id))

    .returning();



  return NextResponse.json({ success: true, settings: updated });

}

