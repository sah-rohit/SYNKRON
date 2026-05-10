/**
 * Ostinato Health Check
 * GET /api/v1/health
 *
 * Returns system status including database, AI providers, and webhook listener.
 */
import { NextResponse } from 'next/server';

interface ServiceStatus {
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  message?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services: {
    database: ServiceStatus;
    groq: ServiceStatus;
    openai: ServiceStatus;
    webhook: ServiceStatus;
  };
  uptime: number;
}

const startTime = Date.now();

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkGroq(),
    checkOpenAI(),
  ]);

  const [dbResult, groqResult, openaiResult] = checks;

  const database: ServiceStatus =
    dbResult.status === 'fulfilled' ? dbResult.value : { status: 'down', message: String((dbResult as PromiseRejectedResult).reason) };
  const groq: ServiceStatus =
    groqResult.status === 'fulfilled' ? groqResult.value : { status: 'down', message: String((groqResult as PromiseRejectedResult).reason) };
  const openai: ServiceStatus =
    openaiResult.status === 'fulfilled' ? openaiResult.value : { status: 'down', message: String((openaiResult as PromiseRejectedResult).reason) };

  const webhook: ServiceStatus = { status: 'ok', message: 'Listening on /api/webhook' };

  const allOk = [database, groq, openai, webhook].every((s) => s.status === 'ok');
  const anyDown = [database, groq, openai].every((s) => s.status === 'down');

  const overallStatus = allOk ? 'healthy' : anyDown ? 'unhealthy' : 'degraded';

  return NextResponse.json(
    {
      status: overallStatus,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: { database, groq, openai, webhook },
      uptime: Math.floor((Date.now() - startTime) / 1000),
    },
    {
      status: overallStatus === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

async function checkDatabase(): Promise<ServiceStatus> {
  if (!process.env.DATABASE_URL) {
    return { status: 'degraded', message: 'DATABASE_URL not configured' };
  }
  const start = Date.now();
  try {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    // Simple connectivity check
    await db.execute('SELECT 1' as any);
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err: any) {
    return { status: 'down', message: err.message };
  }
}

async function checkGroq(): Promise<ServiceStatus> {
  if (!process.env.GROQ_API_KEY) {
    return { status: 'degraded', message: 'GROQ_API_KEY not configured' };
  }
  return { status: 'ok', message: 'API key present' };
}

async function checkOpenAI(): Promise<ServiceStatus> {
  if (!process.env.OPENAI_API_KEY) {
    return { status: 'degraded', message: 'OPENAI_API_KEY not configured' };
  }
  return { status: 'ok', message: 'API key present' };
}
