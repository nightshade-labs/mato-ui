import { query } from "@/lib/db";
import { PriceChart } from "./swap-ui";
import { UTCTimestamp } from "lightweight-charts";

export interface MarketDataRow {
  time: UTCTimestamp;
  // low: number | null;
  // high: number | null;
  // open: number | null;
  value: number | null;
}

export default async function MarketDataPage() {
  // Example: Using raw table with time_bucket.
  // Or switch to your continuous aggregate view.
  const rows = await query(`
    SELECT
      time_bucket('60 seconds', time) AS time,
      AVG(flow_b::double precision / flow_a::double precision) as avg,
      FIRST(flow_b::double precision / flow_a::double precision, time) as open,
      MAX(flow_b::double precision / flow_a::double precision) as high,
      MIN(flow_b::double precision / flow_a::double precision) as low,
      LAST(flow_b::double precision / flow_a::double precision, time) as close
    FROM market_data
    WHERE flow_a > 0 AND flow_b > 0 AND time >= NOW() - INTERVAL '7 days'
    GROUP BY 1
    ORDER BY 1
    LIMIT 100
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
