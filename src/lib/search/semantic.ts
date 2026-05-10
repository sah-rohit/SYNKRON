/**
 * Ostinato Semantic Search
 * Generates embeddings for code + docs and enables natural language search.
 * Uses OpenAI's text-embedding-3-small model.
 */
import { embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict',
});

/**
 * Generate an embedding vector for a given text.
 * Returns a serialized float32 array (JSON string).
 */
export async function generateEmbedding(text: string): Promise<string> {
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text,
    });
    return JSON.stringify(embedding);
  } catch (err: any) {
    console.error('[Semantic] Embedding generation failed:', err.message);
    throw new Error(`Failed to generate embedding: ${err.message}`);
  }
}

/**
 * Compute cosine similarity between two embedding vectors.
 * Both inputs are JSON-serialized float32 arrays.
 */
export function cosineSimilarity(a: string, b: string): number {
  const vecA: number[] = JSON.parse(a);
  const vecB: number[] = JSON.parse(b);

  if (vecA.length !== vecB.length) {
    throw new Error('Embedding dimensions do not match');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search for the most relevant doc files given a natural language query.
 * Returns an array of { docFileId, similarity } sorted by relevance.
 */
export async function semanticSearch(
  query: string,
  docFiles: Array<{ id: string; embeddingVector: string | null }>
): Promise<Array<{ docFileId: string; similarity: number }>> {
  const queryEmbedding = await generateEmbedding(query);

  const results = docFiles
    .filter((doc) => doc.embeddingVector)
    .map((doc) => ({
      docFileId: doc.id,
      similarity: cosineSimilarity(queryEmbedding, doc.embeddingVector!),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  return results;
}
