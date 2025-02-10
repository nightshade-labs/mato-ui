"use client";

import { PriceChart, SwapInterface } from "./swap-ui";

export default function MatoFeature() {
  return (
    <div className="flex flex-col-reverse lg:flex-row gap-8 justify-center py-24">
      <PriceChart />
      <SwapInterface />
    </div>
  );
}
