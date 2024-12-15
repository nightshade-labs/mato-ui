"use client";

import useWindowDimensions from "@/hooks/window-dimension";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useMatoProgram } from "./mato-data-access";
import { LoadingSpinner } from "../ui/loading-spinner";
import { Button } from "../ui/button";
import { OrderDialog } from "./mato-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, type Connection } from "@solana/web3.js";
import { AppHero } from "../ui/ui-layout";

const chartData = [
  { month: "January", solPrice: 101 },
  { month: "February", solPrice: 97 },
  { month: "March", solPrice: 125 },
  { month: "April", solPrice: 192 },
  { month: "May", solPrice: 129 },
  { month: "June", solPrice: 165 },
  { month: "July", solPrice: 146 },
  { month: "August", solPrice: 171 },
  { month: "September", solPrice: 135 },
  { month: "October", solPrice: 152 },
];

export function MarketChart() {
  const { width } = useWindowDimensions();
  const { getMarket, depositTokenA, depositTokenB } = useMatoProgram();
  const { connection } = useConnection();

  if (getMarket.isLoading) {
    return (
      <div className="w-full flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  // let tresurayA = await connection.getTokenAccountBalance(
  //   getMarket.data?.treasuryA || PublicKey.default
  // );
  // let treasuryB = await connection.getTokenAccountBalance(
  //   getMarket.data?.treasuryB || PublicKey.default
  // );

  // console.log("tokenvolume a", getMarket.data?.tokenAVolume.toString());
  // console.log("tokenvolume b", getMarket.data?.tokenBVolume.toString());
  // console.log("treasury A", tresurayA);
  // console.log("treasury B", treasuryB);

  let tradingVolumeA = getMarket.data?.tokenAVolume.toNumber() || 0;
  let tradingVolumeB = getMarket.data?.tokenBVolume.toNumber() || 0;
  let isTrading = tradingVolumeA * tradingVolumeB !== 0;

  let marketPrice = isTrading
    ? ((tradingVolumeB * 1000) / tradingVolumeA).toFixed(2)
    : "no trades right now";

  return (
    <div className="flex flex-col gap-4 w-full items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>tSOL / tUSDC</CardTitle>
          <CardDescription>
            {isTrading && <p>Current Price: {marketPrice} tUSDC per SOL</p>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppHero title={marketPrice} subtitle={"tUSDC per tSOL"}></AppHero>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-end justify-between gap-2 text-sm">
            <div className="grid gap-2">
              <div className="flex flex-col items-start gap-2 font-medium leading-none">
                Trading Volume
              </div>
              <div className="flex flex-col items-start gap-2 leading-none text-muted-foreground">
                <p>
                  {isTrading
                    ? (
                        (tradingVolumeA * 2.5 * 60 * 60) /
                        1000000000 /
                        1000000
                      ).toFixed(2)
                    : 0}{" "}
                  tSOL per hour
                </p>
                <p>
                  {isTrading
                    ? (
                        (tradingVolumeB * 2.5 * 60 * 60) /
                        1000000 /
                        1000000
                      ).toFixed(2)
                    : 0}{" "}
                  tUSDC per hour
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <OrderDialog
                title={"Buy tSOL"}
                amountLabel="Amount of tUSDC"
                handleSubmit={async (amount: number, duration: string) => {
                  let durationSlot = durationStringToSlots.get(duration);
                  depositTokenB.mutate({
                    amount: amount * 1000000,
                    duration: durationSlot || 0,
                  });
                }}
              />
              <OrderDialog
                title={"Sell tSOL"}
                amountLabel="Amount of tSOL"
                handleSubmit={async (amount: number, duration: string) => {
                  let slotDuration = durationStringToSlots.get(duration);
                  depositTokenA.mutate({
                    amount: amount * 1000000000,
                    duration: slotDuration || 0,
                  });
                }}
              />
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export const durationStringToSlots = new Map<string, number>();
const slotsPerSecond = 2.5;

durationStringToSlots.set("1min", 60 * slotsPerSecond);
durationStringToSlots.set("5min", 5 * 60 * slotsPerSecond);
durationStringToSlots.set("1hour", 60 * 60 * slotsPerSecond);
durationStringToSlots.set("1day", 60 * 60 * 24 * slotsPerSecond);
durationStringToSlots.set("1week", 60 * 60 * 24 * 7 * slotsPerSecond);
durationStringToSlots.set("1month", 60 * 60 * 24 * 30 * slotsPerSecond);
