/**
 * SYNKRON Semantic Search API
 * POST /api/v1/search
 *
 * Accepts a natural language query and returns the most relevant
 * documentation sections using vector similarity search.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { zodMsg } from '@/lib/api/zod-error';

const SearchSchema = z.object({
  query: z.string().min(1).max(500),
  repositoryId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(20).optional().default(5),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });
  }

  const { query, repositoryId, limit } = parsed.data;

  // Check if DB and OpenAI are configured
  if (!process.env.DATABASE_URL || !process.env.OPENAI_API_KEY) {
    // Return demo results when not fully configured
    return NextResponse.json({
      success: true,
      results: getDemoResults(query),
      query,
      note: 'Demo mode: Configure DATABASE_URL and OPENAI_API_KEY for real semantic search',
    });
  }

  try {
    const { getDb, schema } = await import('@/lib/db');
    const { semanticSearch } = await import('@/lib/search/semantic');
    const { eq } = await import('drizzle-orm');

    const db = getDb();

    // Fetch doc files with embeddings
    const docFiles = repositoryId
      ? await db
          .select({ id: schema.docFiles.id, embeddingVector: schema.docFiles.embeddingVector, filePath: schema.docFiles.filePath, healedMarkdown: schema.docFiles.healedMarkdown })
          .from(schema.docFiles)
          .where(eq(schema.docFiles.repositoryId, repositoryId))
      : await db
          .select({ id: schema.docFiles.id, embeddingVector: schema.docFiles.embeddingVector, filePath: schema.docFiles.filePath, healedMarkdown: schema.docFiles.healedMarkdown })
          .from(schema.docFiles);

    const withEmbeddings = docFiles.filter((d) => d.embeddingVector);

    if (!withEmbeddings.length) {
      return NextResponse.json({
        success: true,
        results: [],
        query,
        note: 'No indexed documents found. Trigger a heal to generate embeddings.',
      });
    }

    const ranked = await semanticSearch(query, withEmbeddings);
    const top = ranked.slice(0, limit);

    const results = top.map((r) => {
      const doc = docFiles.find((d) => d.id === r.docFileId)!;
      return {
        docFileId: r.docFileId,
        filePath: doc.filePath,
        similarity: Math.round(r.similarity * 100) / 100,
        excerpt: doc.healedMarkdown.slice(0, 300) + (doc.healedMarkdown.length > 300 ? '...' : ''),
      };
    });

    return NextResponse.json({ success: true, results, query });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Search failed: ${err.message}` },
      { status: 500 }
    );
  }
}

function getDemoResults(query: string) {
  const demos = [
    {
      docFileId: 'demo-1',
      filePath: 'src/auth/session.ts',
      similarity: 0.92,
      excerpt: '# Session Management API\n\n## `createSession`\nGenerates a new secure user session token with 24-hour validity...',
    },
    {
      docFileId: 'demo-2',
      filePath: 'src/config/database.ts',
      similarity: 0.78,
      excerpt: '# Database Config API\n\n## `connectDB`\nEstablishes connection pool with the PostgreSQL server. Pool size: 20 connections...',
    },
    {
      docFileId: 'demo-3',
      filePath: 'src/api/webhook/route.ts',
      similarity: 0.65,
      excerpt: '# Webhook Handler\n\nReceives GitHub push events and triggers the self-healing documentation pipeline...',
    },
  ];

  // Simple keyword relevance for demo
  return demos.filter((d) =>
    d.excerpt.toLowerCase().includes(query.toLowerCase().split(' ')[0])
  ).slice(0, 3) || demos.slice(0, 2);
}
