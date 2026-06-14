import { Pool } from 'pg'

const globalForPg = globalThis as unknown as { pgPool: Pool | undefined }

export const db = globalForPg.pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
})

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = db
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await db.query(text, params)
  return result.rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await db.query(text, params)
  return result.rows[0] as T ?? null
}
