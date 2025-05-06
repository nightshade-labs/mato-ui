"use client";

import React, { useState } from "react";
import { VOLUME_PRECISION } from "@/lib/constants";
import { useMatoProgram } from "../mato/mato-data-access";
import { BN } from "@coral-xyz/anchor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGetSlot } from "../cluster/cluster-data-access";
import Image from "next/image";
import Link from "next/link";
import { SquareArrowOutUpRightIcon } from "lucide-react";

const PositionCard = ({
  selling,
  buying,
  positionData,
  decimals,
  avgPrice,
  lastSlot,
  marketPrice,
  close,
}: {
  selling: string;
  buying: string;
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
  close: (id: BN) => void;
}) => {
  const getSlot = useGetSlot();
  const currentSlot = getSlot.data || 0;

  const { amount, startSlot, endSlot, bookkeeping } = positionData;
  const volume = amount.div(endSlot.sub(startSlot));

  const slot = currentSlot > endSlot.toNumber() ? endSlot : new BN(currentSlot);
  const currentLastSlot =
    lastSlot.toNumber() > endSlot.toNumber() ? endSlot : lastSlot;

  const totalDuration = endSlot.sub(startSlot).toNumber();
  const elapsedDuration = slot.sub(startSlot).toNumber();
  const progressPercentage = (elapsedDuration / totalDuration) * 100;

  // Calculate remaining time in seconds (assuming each slot is ~400ms)
  const remainingSlots = endSlot.toNumber() - currentSlot;
  const remainingTimeSeconds = remainingSlots * 0.4;

  // Format remaining time as m:ss
  const minutes = Math.floor(remainingTimeSeconds / 60);
  const seconds = Math.floor(remainingTimeSeconds % 60);
  const timeLeftFormatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

  console.log("marketPrice", avgPrice.toString());
  // Format average price
  const formattedAvgPrice = (
    Number(avgPrice.toString()) /
    decimals ** 2
  ).toFixed(2);

  return (
    <Card className="bg-[#0A352B] border-none rounded-lg p-2.5 flex flex-col gap-3 flex-1 min-w-[250px]">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span className="text-[#E9F6F3] font-bold text-xs">{selling}</span>
          <div className="text-white">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 12H19M19 12L12 5M19 12L12 19"
                stroke="#A7EEDD"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-[#E9F6F3] font-bold text-xs">{buying}</span>
        </div>
        <span className="text-[#1CF6C2] text-xs font-medium">[Active]</span>
      </div>

      <div className="flex items-center w-full gap-1">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1CF6C2] to-[#102924] p-[1px] flex items-center justify-center">
          <div className="w-full h-full rounded-full overflow-hidden">
            <Image
              src={`/${selling.toLowerCase() === "sol" ? "solana-sol-logo.png" : "usd-coin-usdc-logo.png"}`}
              alt={selling}
              width={24}
              height={24}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1 h-2 bg-[#109071] rounded-lg">
          <div
            className="h-full bg-[#1CF6C2] rounded-l-lg"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1CF6C2] to-[#102924] p-[1px] flex items-center justify-center">
          <div className="w-full h-full rounded-full overflow-hidden">
            <Image
              src={`/${buying.toLowerCase() === "sol" ? "solana-sol-logo.png" : "usd-coin-usdc-logo.png"}`}
              alt={buying}
              width={24}
              height={24}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center w-full gap-1 flex-wrap">
          <span className="text-[#E9F6F3] font-bold text-xs">Time Left:</span>
          <span className="text-[#1CF6C2] text-xs font-medium">
            {timeLeftFormatted}
          </span>
        </div>

        <div className="flex items-center w-full gap-1 flex-wrap">
          <span className="text-[#E9F6F3] font-bold text-xs">Avg Price:</span>
          <span className="text-[#1CF6C2] text-xs font-medium">
            {formattedAvgPrice} {buying}/{selling}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default function PositionsSection() {
  const {
    getAllPositionA,
    getAllPositionB,
    withdrawTokenA,
    withdrawTokenB,
    closePositionA,
    closePositionB,
    getBookkeepingAccount,
    getMarketAccount,
  } = useMatoProgram();

  const [showAllPositions, setShowAllPositions] = useState(true);

  // Check if there are positions to display
  const hasPositions =
    (getAllPositionA.data && getAllPositionA.data.length > 0) ||
    (getAllPositionB.data && getAllPositionB.data.length > 0);

  if (!hasPositions) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <div className="bg-[#102924] px-2.5 py-2.5 rounded-lg">
          <h3 className="text-[#E9F6F3] font-semibold text-xl">
            Current Positions
          </h3>
        </div>
        <Link href="/positions">
          <Button
            variant="outline"
            className="text-[#E9F6F3] text-xs font-bold border-[#053A2D] bg-[#102924] rounded-lg h-8 px-3"
          >
            All Positions
            <SquareArrowOutUpRightIcon size={16} />
          </Button>
        </Link>
      </div>

      <div className="bg-[#102924] p-2.5 rounded-lg flex flex-wrap gap-3">
        {getBookkeepingAccount.data && getMarketAccount.data && (
          <>
            {getAllPositionA.data &&
              showAllPositions &&
              getAllPositionA.data.map((data) => (
                <PositionCard
                  key={data.publicKey.toString()}
                  selling="SOL"
                  buying="USDC"
                  positionData={data.account}
                  decimals={10 ** 9}
                  avgPrice={getBookkeepingAccount.data.bPerA}
                  lastSlot={getBookkeepingAccount.data.lastSlot}
                  marketPrice={getMarketAccount.data.tokenBVolume
                    .mul(new BN(VOLUME_PRECISION))
                    .div(getMarketAccount.data.tokenAVolume)}
                  close={(id: BN) => closePositionA.mutate(id)}
                />
              ))}

            {getAllPositionB.data &&
              showAllPositions &&
              getAllPositionB.data.map((data) => (
                <PositionCard
                  key={data.publicKey.toString()}
                  selling="USDC"
                  buying="SOL"
                  positionData={data.account}
                  decimals={10 ** 6} // Fix: Use 10^6 for USDC (6 decimals)
                  avgPrice={getBookkeepingAccount.data.aPerB}
                  lastSlot={getBookkeepingAccount.data.lastSlot}
                  marketPrice={getMarketAccount.data.tokenAVolume
                    .mul(new BN(VOLUME_PRECISION))
                    .div(getMarketAccount.data.tokenBVolume)}
                  close={(id: BN) => closePositionB.mutate(id)}
                />
              ))}
          </>
        )}

        {/* Show a message if there are no positions */}
        {hasPositions &&
          getAllPositionA.data?.length === 0 &&
          getAllPositionB.data?.length === 0 && (
            <div className="w-full text-center py-8">
              <p className="text-[#E9F6F3] text-sm">No positions found</p>
            </div>
          )}
      </div>
    </div>
  );
}
