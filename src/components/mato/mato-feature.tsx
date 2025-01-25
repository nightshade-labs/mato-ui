"use client";

import BN from "bn.js";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useMatoProgram } from "./mato-data-access";
import { SwapInterface } from "./mato-ui";

export default function MatoFeature() {
  console.log("MatoFeature, RPC_URL", process.env.RPC_KEY);

  const { getMarket, depositTokenA, depositTokenB } = useMatoProgram();

  let tradingVolumeA =
    getMarket.data?.tokenAVolume.div(new BN(1000000)).toNumber() || 0;
  let tradingVolumeB =
    getMarket.data?.tokenBVolume.div(new BN(1000000)).toNumber() || 0;
  let isTrading = tradingVolumeA * tradingVolumeB !== 0;

  let marketPrice = isTrading
    ? ((tradingVolumeB * 1000) / tradingVolumeA).toFixed(4)
    : "no trades right now";

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-8 justify-center py-24">
      <Card className="w-full lg:w-1/2 sm:min-h-96">
        <CardHeader>
          <CardTitle>
            <div className="flex justify-between items-center">
              <div className="flex gap-4 text-xl items-center">
                <div className="flex gap-0">
                  <Avatar className="w-8 h-8 hidden sm:block bg-black">
                    <AvatarImage src={"solana-sol-logo.png"} />
                    <AvatarFallback>{"matoSOL"}</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-8 h-8 hidden sm:block">
                    <AvatarImage src={"usd-coin-usdc-logo.png"} />
                    <AvatarFallback>{"matoUSDC"}</AvatarFallback>
                  </Avatar>
                </div>
                matoSOL / matoUSDC
              </div>
              <span className="text-2xl">{marketPrice}</span>
            </div>
          </CardTitle>
          {/* <CardDescription>Card Description</CardDescription> */}
        </CardHeader>
        <CardContent className="flex items-center w-full justify-center">
          Price Chart coming soon
        </CardContent>
      </Card>
      <SwapInterface />
    </div>
  );
}
