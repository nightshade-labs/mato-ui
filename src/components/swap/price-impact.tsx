import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useMatoProgram } from "../mato/mato-data-access";
import { VOLUME_PRECISION } from "@/lib/constants";
import BN from "bn.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Info } from "lucide-react";

export function PriceImpact({
  flow,
  side,
}: {
  flow: number;
  side: "buy" | "sell";
}) {
  const { getMarketAccount } = useMatoProgram();
  let tradingVolumeA =
    getMarketAccount.data?.tokenAVolume
      .div(new BN(VOLUME_PRECISION))
      .toNumber() || 0;
  let tradingVolumeB =
    getMarketAccount.data?.tokenBVolume
      .div(new BN(VOLUME_PRECISION))
      .toNumber() || 0;

  let priceImpact;

  if (side == "buy") {
    priceImpact = (flow / tradingVolumeB) * 100;
  } else {
    priceImpact = (flow / (flow + tradingVolumeA)) * 100;
  }

  if (side == "buy") {
    tradingVolumeB += flow;
  } else {
    tradingVolumeA += flow;
  }

  let isTrading = tradingVolumeA * tradingVolumeB !== 0;
  let marketPrice = isTrading
    ? ((tradingVolumeB * LAMPORTS_PER_SOL) / 1000000 / tradingVolumeA).toFixed(
        2
      )
    : "";

  return (
    // <div className="bg-bg-2-80 p-3  rounded-lg">
    //   <div className="text-sm font-semibold">Price Impact:</div>
    //   <div className="flex gap-2 items-center">
    //     <div className="text-sm">{marketPrice} USDC</div>
    //     <div className="text-xs font-bold text-purple-400">
    //       {side == "buy" ? "+" : "-"}
    //       {priceImpact.toFixed(1)}%
    //     </div>
    //   </div>
    // </div>
    <div className="bg-bg-2-80 p-3  rounded-lg ">
      <div className="flex justify-between ">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-[#E9F6F3]">
            Price Impact
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-white">
                  <Info size={12} className="text-[#40A68D]" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  The difference between market price and estimated price due to
                  trade size
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-[#E9F6F3]">
            {marketPrice}
          </span>
          <span className="text-xs font-medium text-[#1CF6C2]">
            {side == "buy" ? "+" : "-"}
            {priceImpact.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
