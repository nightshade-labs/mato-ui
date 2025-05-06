"use client";

import MarketDataPage from "./market-data";
import { SwapPanel } from "./swap-panel";

export default function MatoFeature() {
  return (
    <div className="flex flex-col-reverse lg:flex-row gap-5 justify-center py-16 lg:px-4 max-w-7xl mx-auto">
      <div className="w-full lg:w-3/5 bg-[#102924] p-2.5 rounded-lg">
        {/* <MarketDataPage /> */}
      </div>
      <div className="w-full lg:w-2/5">
        <SwapPanel />
      </div>
    </div>
  );
}
