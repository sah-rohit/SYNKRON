/**
 * Stale Doc Alerts API
 * GET /api/stale-docs
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const thresholdDays = parseInt(req.nextUrl.searchParams.get('days') || '3');

  try {
    const { getDb, schema } = await import('@/lib/db');
    const { lt, or, isNull } = await import('drizzle-orm');
    const db = getDb();
    const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

    const staleDocs = await db
      .select()
      .from(schema.docFiles)
      .where(or(isNull(schema.docFiles.lastHealedAt), lt(schema.docFiles.lastHealedAt, cutoff)))
      .limit(100);

    const alerts = staleDocs.map(doc => {
      const lastHealed = doc.lastHealedAt ? new Date(doc.lastHealedAt).getTime() : null;
      const daysSinceHeal = lastHealed ? (Date.now() - lastHealed) / (24 * 60 * 60 * 1000) : Infinity;
      return {
        filePath: doc.filePath,
        lastHealedAt: doc.lastHealedAt?.toISOString() || null,
        daysSinceHeal: Math.round(daysSinceHeal * 10) / 10,
        healCount: doc.healCount,
        severity: daysSinceHeal > thresholdDays * 2 ? 'critical' : 'warning',
      };
    }).sort((a, b) => b.daysSinceHeal - a.daysSinceHeal);

    return NextResponse.json({ success: true, thresholdDays, alertCount: alerts.length, alerts });
  } catch {
    return NextResponse.json({
      success: true, thresholdDays, alertCount: 0, alerts: [],
      note: 'Database not configured. Connect a database to enable stale doc detection.',
    });
  }
}
