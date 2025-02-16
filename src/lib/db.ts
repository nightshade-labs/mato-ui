import { Pool } from "pg";

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DATABASE,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export async function query<T = any>(q: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(q, params);
    return rows;
  } finally {
    client.release();
  }
}
