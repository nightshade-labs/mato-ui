"use client";

import MarketDataPage from "./market-data";
import { SwapPanel } from "./swap-panel";
import PositionsSection from "./positions-section";

export default function MatoFeature() {
  return (
    <div className="flex flex-col gap-5 justify-center pt-20 py-10 lg:px-4 max-w-7xl mx-auto">
      <div className="flex flex-col-reverse lg:flex-row gap-5 justify-center w-full">
        <div className="w-full lg:w-3/5 bg-[#102924] p-2.5 rounded-lg">
          <MarketDataPage />
        </div>
        <div className="w-full lg:w-2/5">
          <SwapPanel />
        </div>
      </div>

      <PositionsSection />
    </div>
  );
}
