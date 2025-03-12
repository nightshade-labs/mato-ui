'use server';

import { query } from "@/lib/db";
import { UTCTimestamp } from "lightweight-charts";

export type MarketDataPoint = {
  time: UTCTimestamp;
  value: number;
};

export interface MarketDataPage {
  data: MarketDataPoint[];
  oldestTimestamp: UTCTimestamp | null;
}

export async function fetchMarketData(timestamp?: number): Promise<MarketDataPage> {
  // For the initial load, get data from now to 2 days ago
  // For subsequent loads, get data from the last timestamp to 2 days before that
  const endTime = timestamp ? `to_timestamp(${timestamp})` : 'NOW()';
  const timeCondition = `time <= ${endTime} AND time > ${endTime} - INTERVAL '2 days'`;

  const rows = await query(`    
    WITH filtered_data AS (
      SELECT
        time_bucket('5 seconds', time) AS time,
        AVG(flow_b::double precision / flow_a::double precision) as avg
      FROM market_data
      WHERE flow_a > 0 AND flow_b > 0 AND ${timeCondition}
      GROUP BY 1
    )
    SELECT *
    FROM filtered_data
    ORDER BY time ASC
  `);

  const data = rows.map((row) => ({
    time: Math.floor(row.time / 1000) as UTCTimestamp,
    value: row.avg ? row.avg * 1000 : 0,
  }));

  // If we have data, use the oldest timestamp as the next page param
  // We use the first point's time as it's the oldest in our ascending order
  const oldestTimestamp = data.length > 0 ? data[0].time : null;

  return {
    data,
    oldestTimestamp,
  };
} 