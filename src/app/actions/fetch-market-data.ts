'use server';

import { query } from "@/lib/db";
import { UTCTimestamp } from "lightweight-charts";

export async function fetchMarketData() {
  const rows = await query(`
    SELECT
      time_bucket('5 seconds', time) AS time,
      AVG(flow_b::double precision / flow_a::double precision) as avg,
      FIRST(flow_b::double precision / flow_a::double precision, time) as open,
      MAX(flow_b::double precision / flow_a::double precision) as high,
      MIN(flow_b::double precision / flow_a::double precision) as low,
      LAST(flow_b::double precision / flow_a::double precision, time) as close
    FROM market_data
    WHERE flow_a > 0 AND flow_b > 0 AND time >= NOW() - INTERVAL '2 days'
    GROUP BY 1
    ORDER BY 1
  `);

  return rows.map((row) => ({
    time: Math.floor(row.time / 1000) as UTCTimestamp,
    value: row.avg ? row.avg * 1000 : 0,
  }));
} 