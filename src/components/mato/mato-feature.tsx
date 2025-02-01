"use client";

import BN from "bn.js";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useMatoProgram } from "./mato-data-access";
import { SwapInterface } from "./mato-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { AccountBalance } from "../account/account-ui";

export default function MatoFeature() {
  const { getMarketAccount, depositTokenA, depositTokenB } = useMatoProgram();

  let tradingVolumeA =
    getMarketAccount.data?.tokenAVolume.div(new BN(1000000)).toNumber() || 0;
  let tradingVolumeB =
    getMarketAccount.data?.tokenBVolume.div(new BN(1000000)).toNumber() || 0;
  let isTrading = tradingVolumeA * tradingVolumeB !== 0;

  let marketPrice = isTrading
    ? ((tradingVolumeB * 1000) / tradingVolumeA).toFixed(4)
    : "no trades right now";

  const { publicKey } = useWallet();

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
                    <AvatarFallback>{"SOL"}</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-8 h-8 hidden sm:block">
                    <AvatarImage src={"usd-coin-usdc-logo.png"} />
                    <AvatarFallback>{"USDC"}</AvatarFallback>
                  </Avatar>
                </div>
                SOL / USDC
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
