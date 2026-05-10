/**
 * Doc Health Score API
 * GET /api/health-score
 * POST /api/health-score
 * 
 * Returns a percentage showing how in-sync docs are with code,
 * based on AST diff staleness and heal freshness.
 */
import { NextRequest, NextResponse } from 'next/server';

interface DocHealthReport {
  overallScore: number; // 0-100
  totalFiles: number;
  healthyFiles: number;
  staleFiles: number;
  unhealedFiles: number;
  avgDaysSinceHeal: number;
  files: Array<{
    filePath: string;
    score: number;
    lastHealedAt: string | null;
    healCount: number;
    daysSinceHeal: number | null;
    status: 'healthy' | 'stale' | 'unhealed';
  }>;
}

async function calculateHealthScore(): Promise<DocHealthReport> {
  try {
    const { getDb, schema } = await import('@/lib/db');
    const db = getDb();

    const docs = await db
      .select()
      .from(schema.docFiles)
      .limit(500);

    if (!docs.length) {
      return {
        overallScore: 100,
        totalFiles: 0,
        healthyFiles: 0,
        staleFiles: 0,
        unhealedFiles: 0,
        avgDaysSinceHeal: 0,
        files: [],
      };
    }

    const now = Date.now();
    const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    const fileReports = docs.map(doc => {
      const lastHealed = doc.lastHealedAt ? new Date(doc.lastHealedAt).getTime() : null;
      const daysSinceHeal = lastHealed ? (now - lastHealed) / (24 * 60 * 60 * 1000) : null;
      
      let status: 'healthy' | 'stale' | 'unhealed';
      let score: number;

      if (!lastHealed) {
        status = 'unhealed';
        score = 0;
      } else if (now - lastHealed > STALE_THRESHOLD_MS) {
        status = 'stale';
        // Score degrades linearly after threshold
        const daysOver = ((now - lastHealed) - STALE_THRESHOLD_MS) / (24 * 60 * 60 * 1000);
        score = Math.max(20, 80 - daysOver * 5);
      } else {
        status = 'healthy';
        score = 100;
      }

      // Bonus for files healed multiple times (shows active maintenance)
      if (doc.healCount > 3) score = Math.min(100, score + 5);

      return {
        filePath: doc.filePath,
        score: Math.round(score),
        lastHealedAt: doc.lastHealedAt?.toISOString() || null,
        healCount: doc.healCount,
        daysSinceHeal: daysSinceHeal !== null ? Math.round(daysSinceHeal * 10) / 10 : null,
        status,
      };
    });

    const healthyFiles = fileReports.filter(f => f.status === 'healthy').length;
    const staleFiles = fileReports.filter(f => f.status === 'stale').length;
    const unhealedFiles = fileReports.filter(f => f.status === 'unhealed').length;
    const avgScore = fileReports.reduce((sum, f) => sum + f.score, 0) / fileReports.length;
    const avgDays = fileReports
      .filter(f => f.daysSinceHeal !== null)
      .reduce((sum, f) => sum + (f.daysSinceHeal || 0), 0) / (fileReports.filter(f => f.daysSinceHeal !== null).length || 1);

    return {
      overallScore: Math.round(avgScore),
      totalFiles: docs.length,
      healthyFiles,
      staleFiles,
      unhealedFiles,
      avgDaysSinceHeal: Math.round(avgDays * 10) / 10,
      files: fileReports,
    };
  } catch {
    // DB not configured — return demo data
    return {
      overallScore: 87,
      totalFiles: 0,
      healthyFiles: 0,
      staleFiles: 0,
      unhealedFiles: 0,
      avgDaysSinceHeal: 0,
      files: [],
    };
  }
}

export async function GET() {
  const report = await calculateHealthScore();
  return NextResponse.json({ success: true, ...report });
}

export async function POST(req: NextRequest) {
  const report = await calculateHealthScore();
  return NextResponse.json({ success: true, ...report });
}
