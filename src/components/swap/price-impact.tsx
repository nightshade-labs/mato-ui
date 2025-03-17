import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useMatoProgram } from "../mato/mato-data-access";
import { VOLUME_PRECISION } from "@/lib/constants";
import BN from "bn.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

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
    <div className="flex justify-between border rounded-md px-2 py-4 bg-red-50">
      <div className="text-sm font-semibold">Price Impact:</div>
      <div className="flex gap-2 items-center">
        <div className="text-sm">{marketPrice} USDC</div>
        <div className="text-xs font-bold text-purple-400">
          {side == "buy" ? "+" : "-"}
          {priceImpact.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
