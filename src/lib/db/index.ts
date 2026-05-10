/**
 * SYNKRON Database Client
 * Neon Serverless Postgres + Drizzle ORM
 * Falls back gracefully when DATABASE_URL is not configured.
 */
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add a Neon Postgres connection string to .env.local'
    );
  }

  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

export { schema };
