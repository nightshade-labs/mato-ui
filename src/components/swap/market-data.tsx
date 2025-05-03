"use client";

import { UTCTimestamp, LineData } from "lightweight-charts";
import { PriceChart } from "./price-chart";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCluster } from "../cluster/cluster-data-access";
import { fetchMarketData } from "@/app/actions/fetch-market-data";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export interface MarketDataRow {
  time: UTCTimestamp;
  value: number;
}

export default function MarketDataPage() {
  const { cluster } = useCluster();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["market-data", { cluster }],
      queryFn: ({ pageParam }) =>
        fetchMarketData(pageParam as number | undefined),
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
      const existingTimes = new Set(acc.map((item) => item.time));

      // Only add points that don't already exist
      const newPoints = page.data.filter(
        (point) => !existingTimes.has(point.time)
      );

      return [...acc, ...newPoints];
    }, [] as LineData<UTCTimestamp>[]);

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[#0A352B] rounded-lg p-2.5 flex items-center gap-3">
        <div className="flex items-center">
          <div className="flex items-center gap-0 mr-3">
            <div className="relative">
              <Avatar className="w-8 h-8 border-2 border-[#1CF6C2]/40 bg-gradient-to-br from-[#1CF6C2] to-[#102924] p-0.5">
                <AvatarImage src="/solana-sol-logo.png" />
                <AvatarFallback>SOL</AvatarFallback>
              </Avatar>
              <Avatar className="w-8 h-8 border-2 border-[#1CF6C2]/40 bg-gradient-to-br from-[#1CF6C2] to-[#102924] p-0.5 -ml-2">
                <AvatarImage src="/usd-coin-usdc-logo.png" />
                <AvatarFallback>USDC</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="text-xl font-medium text-white">Sol</span>
            <span className="text-2xl font-medium text-[#E9F6F3]">/</span>
            <span className="text-xl font-semibold text-[#E9F6F3]">USDC</span>
          </div>
        </div>
        <button className="ml-2 text-white">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.3333 4.66667L4.66667 11.3333M4.66667 4.66667L11.3333 11.3333"
              stroke="#1CF6C2"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="bg-[#0A352B] rounded-lg p-2.5 flex-grow">
        <PriceChart data={chartData ?? []} onTimeRangeChange={fetchNextPage} />
      </div>
    </div>
  );
}
