// app/market/page.tsx
import { query } from "@/lib/db";
import { PriceChart } from "./swap-ui";
import { UTCTimestamp } from "lightweight-charts";

export interface MarketDataRow {
  time: UTCTimestamp;
  average_price: number | null;
}

export default async function MarketDataPage() {
  // Example: Using raw table with time_bucket.
  // Or switch to your continuous aggregate view.
  const rows = await query<MarketDataRow>(`
    SELECT
      time_bucket('5 seconds', time) AS time,
      AVG(flow_b::double precision / flow_a::double precision) AS average_price
    FROM market_data
    WHERE flow_a > 0 AND flow_b > 0
    GROUP BY 1
    ORDER BY 1
  `);

  const chartData = rows.map((row) => {
    const date = new Date(row.time);

    return {
      time: Math.floor(date.getTime() / 1000) as UTCTimestamp,
      value: row.average_price ? row.average_price * 1000 : 0,
    };
  });

  return <PriceChart data={chartData} />;
}
