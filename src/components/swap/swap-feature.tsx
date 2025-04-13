"use client";

import MarketDataPage from "./market-data";
import { SwapPanel } from "./swap-panel";

export default function MatoFeature() {
  return (
    <div className="flex flex-col-reverse lg:flex-row gap-8 justify-center py-24">
      <MarketDataPage />
      <SwapPanel />
    </div>
  );
}
