import { Pool } from "pg";

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  // ssl:
  //   process.env.NODE_ENV === "production"
  //     ? { rejectUnauthorized: false }
  //     : false,
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
