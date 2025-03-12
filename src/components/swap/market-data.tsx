"use client";

import { UTCTimestamp, LineData } from "lightweight-charts";
import { PriceChart } from "./price-chart";
import { useQuery } from "@tanstack/react-query";
import { useCluster } from "../cluster/cluster-data-access";
import { fetchMarketData } from "@/app/actions/fetch-market-data";

export interface MarketDataRow {
  time: UTCTimestamp;
  value: number;
}

export default function MarketDataPage() {
  const { cluster } = useCluster();
  const { data: chartData = [] } = useQuery({
    queryKey: ["market-data", { cluster }],
    queryFn: fetchMarketData,
  });

  return <PriceChart data={chartData} />;
}
