import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

export function createDb(connectionString: string) {
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = postgres(connectionString, {
    ssl: isLocal ? false : 'prefer',
  });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
