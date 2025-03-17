import { Card } from "../ui/card";
import MarketDataPage from "./market-data";
import { SwapPanel } from "./swap-panel";

export default function MatoFeature() {
  return (
    <div className="flex flex-col-reverse lg:flex-row gap-8 justify-center py-24">
      {/* <MarketDataPage /> */}
      <Card className="w-full lg:w-1/2 sm:min-h-96 text-center pt-16 text-2xl font-bold">
        Price Chart coming soon
      </Card>
      <SwapPanel />
    </div>
  );
}
