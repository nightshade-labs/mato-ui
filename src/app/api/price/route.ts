import { MarketDataRow } from "@/components/swap/market-data";
import { query } from "@/lib/db";
import { UTCTimestamp } from "lightweight-charts";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await query(`
    SELECT
      time_bucket('1 seconds', time) AS time,
      FIRST(flow_b::double precision / flow_a::double precision, time) as open,
      MAX(flow_b::double precision / flow_a::double precision) as high,
      MIN(flow_b::double precision / flow_a::double precision) as low,
      LAST(flow_b::double precision / flow_a::double precision, time) as close
    FROM market_data
    WHERE flow_a > 0 AND flow_b > 0
    GROUP BY time
    ORDER BY time DESC
    LIMIT 1
    `);

    if (rows.length > 0) {
      return NextResponse.json({
        time: Math.floor(rows[0].time / 1000) as UTCTimestamp,
        // low: rows[0].low ? rows[0].low * 1000 : 0,
        // high: rows[0].high ? rows[0].high * 1000 : 0,
        // open: rows[0].open ? rows[0].open * 1000 : 0,
        value: rows[0].close ? rows[0].close * 1000 : 0,
      });
    }

    return NextResponse.json(null);
  } catch (error) {
    return NextResponse.error();
  }
}
