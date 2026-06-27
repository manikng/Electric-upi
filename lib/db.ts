import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolConfig } from "pg";

// Prefer DATABASE_URL (direct), fallback to DBTransactionPoolerURL (transaction-mode)
const connectionString = process.env.DATABASE_URL || process.env.DBTransactionPoolerURL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is missing");
}

// Drizzle manages the pg.Pool internally — avoids pg.Pool URL-parsing crash
// with Supabase transaction-mode pooler URLs.
const poolConfig: PoolConfig = {
  connectionString,
  max: 30,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 15_000,
  keepAlive: true,
};

const globalForDb = globalThis as unknown as { _db?: ReturnType<typeof drizzle> };

export const db =
  globalForDb._db ??
  drizzle({ connection: poolConfig });

if (process.env.NODE_ENV !== "production") {
  globalForDb._db = db;
}