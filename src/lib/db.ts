import { Pool } from "pg";

let pool: Pool;

function getPool() {
  if (!pool) {
    // In production, reuse the pool but with proper configuration
    pool = new Pool({
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT),
      database: process.env.PGDATABASE,
      // ssl:
      //   process.env.NODE_ENV === "production"
      //     ? { rejectUnauthorized: false }
      //     : false,
      max: 20,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }

  return pool;
}

export async function query<T = any>(q: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { rows } = await client.query(q, params);
    return rows;
  } finally {
    client.release();
  }
}
