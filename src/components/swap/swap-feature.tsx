"use client";

import { VOLUME_PRECISION } from "@/lib/constants";
import { useMatoProgram } from "../mato/mato-data-access";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import MarketDataPage from "./market-data";
import { SwapPanel } from "./swap-panel";
import BN from "bn.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export default function MatoFeature() {
  const { getMarketAccount } = useMatoProgram();

  let tradingVolumeA =
    getMarketAccount.data?.tokenAVolume
      .div(new BN(VOLUME_PRECISION))
      .toNumber() || 0;
  let tradingVolumeB =
    getMarketAccount.data?.tokenBVolume
      .div(new BN(VOLUME_PRECISION))
      .toNumber() || 0;

  let isTrading = tradingVolumeA * tradingVolumeB !== 0;

  let marketPrice = isTrading
    ? ((tradingVolumeB * LAMPORTS_PER_SOL) / 1000000 / tradingVolumeA).toFixed(
        2
      ) + " USDC"
    : "no trades right now";

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-8 justify-center py-24">
      {/* <MarketDataPage /> */}
      <Card className="w-full lg:w-1/2 sm:min-h-96">
        <CardHeader>
          <CardTitle>
            <div className="flex justify-between items-center">
              <div className="flex gap-4 text-xl items-center">
                <div className="flex gap-0">
                  <Avatar className="w-6 h-6 sm:w-8 sm:h-8 bg-black">
                    <AvatarImage src={"solana-sol-logo.png"} />
                    <AvatarFallback>{"SOL"}</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                    <AvatarImage src={"usd-coin-usdc-logo.png"} />
                    <AvatarFallback>{"USDC"}</AvatarFallback>
                  </Avatar>
                </div>
                SOL / USDC
              </div>
              <span className="text-2xl">{marketPrice}</span>
            </div>
            {/* <div className="mt-4 text-sm">
            Flow (SOL per minute):{" "}
            {((tradingVolumeA * 2.5 * 60) / LAMPORTS_PER_SOL).toFixed(2)}
          </div>
          <div className="mt-0 text-sm">
            Flow (USDC per minute):{" "}
            {((tradingVolumeB * 2.5 * 60) / 1000000).toFixed(2)}
          </div> */}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-2xl font-bold py-16">
          Price Chart coming soon
        </CardContent>
      </Card>
      <SwapPanel />
    </div>
  );
}
