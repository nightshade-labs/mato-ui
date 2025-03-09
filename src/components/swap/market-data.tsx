export const dynamic = "force-dynamic";
export const revalidate = 0;
import { query } from "@/lib/db";
import { UTCTimestamp } from "lightweight-charts";
import { PriceChart } from "./price-chart";

export interface MarketDataRow {
  time: UTCTimestamp;
  // low: number | null;
  // high: number | null;
  // open: number | null;
  value: number | null;
}

export default async function MarketDataPage() {
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

  const chartData = rows.map((row) => {
    return {
      time: Math.floor(row.time / 1000) as UTCTimestamp,
      // low: row.low ? row.low * 1000 : 0,
      // high: row.high ? row.high * 1000 : 0,
      // open: row.open ? row.open * 1000 : 0,
      value: row.avg ? row.avg * 1000 : 0,
    };
  });

  return <PriceChart data={chartData} />;
}
