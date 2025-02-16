import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await query(`
      SELECT
        time_bucket('5 seconds', time) AS time,
        AVG(flow_b::double precision / flow_a::double precision) AS average_price
      FROM market_data
      WHERE flow_a > 0 AND flow_b > 0
      GROUP BY time
      ORDER BY time DESC
      LIMIT 1
    `);

    if (rows.length > 0) {
      return NextResponse.json({
        time: Math.floor(rows[0].time.getTime() / 1000),
        value: rows[0].average_price * 1000,
      });
    }

    return NextResponse.json(null);
  } catch (error) {
    return NextResponse.error();
  }
}
