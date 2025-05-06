import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "../ui/progress";
import { BN } from "@coral-xyz/anchor";
import { BOOKKEEPING_PRECISION, VOLUME_PRECISION } from "@/lib/constants";
import { useGetSlot } from "../cluster/cluster-data-access";

export function PositionCard({
  selling,
  buying,
  withdraw,
  close,
  positionData,
  decimals,
  avgPrice,
  lastSlot,
  marketPrice,
}: {
  selling: string;
  buying: string;
  withdraw: (id: BN) => void;
  close: (id: BN) => void;
  positionData: {
    id: BN;
    amount: BN;
    startSlot: BN;
    endSlot: BN;
    bookkeeping: BN;
    noTradeSlots: BN;
    totalNoTrades: BN;
    bump: number;
  };
  decimals: number;
  avgPrice: BN;
  lastSlot: BN;
  marketPrice: BN;
}) {
  const getSlot = useGetSlot();
  let currentSlot = getSlot.data || 0;

  let amount = positionData.amount;
  let startSlot = positionData.startSlot;
  let endSlot = positionData.endSlot;
  let bookkeeping = positionData.bookkeeping;
  let volume = amount.div(endSlot.sub(startSlot));

  let slot = currentSlot > endSlot.toNumber() ? endSlot : new BN(currentSlot);
  lastSlot = lastSlot.toNumber() > endSlot.toNumber() ? endSlot : lastSlot;

  let remainingAmount = amount.sub(volume.mul(slot.sub(startSlot)));
  let swappedTokensMarket = volume
    .mul(slot.sub(lastSlot).mul(marketPrice))
    .div(new BN(VOLUME_PRECISION));

  let swappedTokensBook = avgPrice
    .sub(bookkeeping)
    .mul(volume)
    .div(new BN(BOOKKEEPING_PRECISION));

  let swappedTokens = swappedTokensBook.add(swappedTokensMarket);

  let swappedEstimate = amount.mul(marketPrice).add(swappedTokens);

  return (
    <Card className="w-[350px]">
      <CardContent>
        <div className="flex flex-col gap-4 font-bold items-start mt-4 ">
          <div className="flex justify-between w-full">
            <p>Selling {selling}</p>
            <p>
              {(remainingAmount.toNumber() / decimals).toFixed(
                selling === "SOL" ? 9 : 2
              )}{" "}
              {selling}
            </p>
          </div>
          <Progress
            value={(remainingAmount.toNumber() / amount.toNumber()) * 100}
            className="h-4 mb-4 -mt-2"
          />
          <div className="flex justify-between w-full">
            <p>Buying {buying}</p>
            <p>
              {(
                swappedTokens.toNumber() /
                (buying === "SOL" ? 10 ** 9 : 10 ** 6)
              ).toFixed(buying === "SOL" ? 9 : 2)}{" "}
              {buying}
            </p>
          </div>
          <Progress
            value={
              (swappedTokens.toNumber() /
                swappedEstimate.div(new BN(VOLUME_PRECISION)).toNumber()) *
              100
            }
            className="h-4 mb-4 -mt-2"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        {/* <Button variant="outline" onClick={() => withdraw(positionData.id)}>
          Withdraw {buying}
        </Button> */}
        <Button onClick={() => close(positionData.id)}>Close Position</Button>
      </CardFooter>
    </Card>
  );
}
