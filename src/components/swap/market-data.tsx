"use client";

import { UTCTimestamp, LineData } from "lightweight-charts";
import { PriceChart } from "./price-chart";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCluster } from "../cluster/cluster-data-access";
import { fetchMarketData, type MarketDataPage } from "@/app/actions/fetch-market-data";

export interface MarketDataRow {
  time: UTCTimestamp;
  value: number;
}

export default function MarketDataPage() {
  const { cluster } = useCluster();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["market-data", { cluster }],
    queryFn: ({ pageParam }) => fetchMarketData(pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.oldestTimestamp,
    staleTime: 0, // Consider data immediately stale to ensure real-time updates
  });

  // Combine all pages of data for the chart, ensuring time-based order and no duplicates
  const chartData = data?.pages
    .slice()
    .reverse()
    .reduce((acc, page) => {
      // Create a Set of existing timestamps for quick lookup
      const existingTimes = new Set(acc.map(item => item.time));
      
      // Only add points that don't already exist
      const newPoints = page.data.filter(point => !existingTimes.has(point.time));
      
      return [...acc, ...newPoints];
    }, [] as LineData<UTCTimestamp>[]);

  return (
    <PriceChart 
      data={chartData ?? []}
      onTimeRangeChange={fetchNextPage}
    />
  );
}
