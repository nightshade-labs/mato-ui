"use client";

import React, { useState, useEffect } from "react";
import { VOLUME_PRECISION } from "@/lib/constants";
import { useMatoProgram } from "../mato/mato-data-access";
import { BN } from "@coral-xyz/anchor";
import { Button } from "@/components/ui/button";
import { useGetSlot } from "../cluster/cluster-data-access";
import Link from "next/link";
import { SquareArrowOutUpRightIcon } from "lucide-react";
import { PositionCard } from "../position/position-card";
import { BOOKKEEPING_PRECISION } from "@/lib/constants";

const SOL_DECIMALS = 9;
const USDC_DECIMALS = 6;

export default function PositionsSection() {
  const {
    getAllPositionA,
    getAllPositionB,
    closePositionA,
    closePositionB,
    getBookkeepingAccount,
    getMarketAccount,
  } = useMatoProgram();

  const [showAllPositions, setShowAllPositions] = useState(true);
  const getSlot = useGetSlot();
  const currentSlot = getSlot.data || 0;
  const currentSlotBn = new BN(currentSlot);

  // Set up refetch interval to update the UI automatically when positions change
  useEffect(() => {
    // Refetch positions every 10 seconds
    const refetchInterval = setInterval(() => {
      getAllPositionA.refetch();
      getAllPositionB.refetch();
    }, 10000);

    return () => clearInterval(refetchInterval);
  }, [getAllPositionA, getAllPositionB]);

  // Filter active positions (where current slot is less than end slot)
  const activePositionsA =
    getAllPositionA.data?.filter((data) =>
      currentSlotBn.lte(data.account.endSlot)
    ) || [];

  const activePositionsB =
    getAllPositionB.data?.filter((data) =>
      currentSlotBn.lte(data.account.endSlot)
    ) || [];

  // Check if there are positions to display
  const hasPositions =
    activePositionsA.length > 0 || activePositionsB.length > 0;

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
            {activePositionsA.length > 0 &&
              showAllPositions &&
              activePositionsA.map((data) => {
                const { id, amount, startSlot, endSlot, bookkeeping } =
                  data.account;
                const slot = currentSlotBn.gt(endSlot)
                  ? endSlot
                  : currentSlotBn;

                // Calculate progress percentage
                const totalDuration = endSlot.sub(startSlot).toNumber();
                const elapsedDuration = slot.sub(startSlot).toNumber();
                const progressPercentage = Math.min(
                  100,
                  totalDuration > 0
                    ? (elapsedDuration / totalDuration) * 100
                    : currentSlotBn.gte(endSlot)
                      ? 100
                      : 0
                );

                // Calculate remaining time
                const remainingSlots = endSlot.sub(currentSlotBn).toNumber();
                const remainingTimeSeconds = remainingSlots * 0.4; // Assuming SLOT_TIME_MS = 400
                const minutes = Math.floor(remainingTimeSeconds / 60);
                const seconds = Math.floor(remainingTimeSeconds % 60);
                const timeLeftFormatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

                // Price calculation and amounts
                const bookkeepingData = getBookkeepingAccount.data;
                const marketData = getMarketAccount.data;

                let volume = amount.div(endSlot.sub(startSlot));
                let soldTokensBn = volume.mul(slot.sub(startSlot));
                let remainingAmountBn = amount.sub(soldTokensBn);

                let lastSlotBn = bookkeepingData.lastSlot.gt(endSlot)
                  ? endSlot
                  : bookkeepingData.lastSlot;
                let marketPrice = marketData.tokenBVolume
                  .mul(new BN(VOLUME_PRECISION))
                  .div(marketData.tokenAVolume);
                let swappedTokensMarket = volume
                  .mul(slot.sub(lastSlotBn).mul(marketPrice))
                  .div(new BN(VOLUME_PRECISION));
                let swappedTokensBook = bookkeepingData.bPerA
                  .sub(bookkeeping)
                  .mul(volume)
                  .div(new BN(BOOKKEEPING_PRECISION));
                let swappedTokensBn =
                  swappedTokensBook.add(swappedTokensMarket);

                const remainingAmount =
                  remainingAmountBn.toNumber() / 10 ** SOL_DECIMALS;
                const swappedAmount =
                  swappedTokensBn.toNumber() / 10 ** USDC_DECIMALS;

                // Format average price
                const avgPriceNum = swappedTokensBn
                  .mul(new BN(VOLUME_PRECISION))
                  .mul(new BN(10 ** SOL_DECIMALS))
                  .div(soldTokensBn.isZero() ? new BN(1) : soldTokensBn) // Avoid division by zero
                  .div(new BN(10 ** USDC_DECIMALS));
                const formattedAvgPrice = avgPriceNum
                  .div(new BN(VOLUME_PRECISION))
                  .toNumber()
                  .toFixed(4);

                // Format amounts
                const amountSol =
                  (Number(amount.toString()) / 10 ** SOL_DECIMALS).toFixed(4) +
                  " SOL";
                const amountUsdc =
                  (
                    (Number(amount.toString()) / 10 ** SOL_DECIMALS) *
                    ((Number(bookkeepingData.bPerA.toString()) /
                      (VOLUME_PRECISION * VOLUME_PRECISION)) * // Adjusted for bPerA precision
                      (10 ** SOL_DECIMALS / 10 ** USDC_DECIMALS))
                  ) // Adjust for token decimals
                    .toFixed(2) + " USDC";

                return (
                  <PositionCard
                    key={data.publicKey.toString()}
                    id={id.toString()}
                    tokens={{
                      from: "SOL",
                      to: "USDC",
                      fromIcon: "/solana-sol-logo.png",
                      toIcon: "/usd-coin-usdc-logo.png",
                    }}
                    remainingAmount={remainingAmount}
                    swappedAmount={swappedAmount}
                    amountFrom={amountSol}
                    amountTo={amountUsdc}
                    avgPrice={formattedAvgPrice}
                    duration={`${Math.floor((totalDuration * 0.4) / 60)}m`}
                    progress={progressPercentage}
                    status="Active"
                    timeLeft={timeLeftFormatted}
                    onClose={() => closePositionA.mutate(id)}
                  />
                );
              })}

            {activePositionsB.length > 0 &&
              showAllPositions &&
              activePositionsB.map((data) => {
                const { id, amount, startSlot, endSlot, bookkeeping } =
                  data.account;
                const slot = currentSlotBn.gt(endSlot)
                  ? endSlot
                  : currentSlotBn;

                // Calculate progress percentage
                const totalDuration = endSlot.sub(startSlot).toNumber();
                const elapsedDuration = slot.sub(startSlot).toNumber();
                const progressPercentage = Math.min(
                  100,
                  totalDuration > 0
                    ? (elapsedDuration / totalDuration) * 100
                    : currentSlotBn.gte(endSlot)
                      ? 100
                      : 0
                );

                // Calculate remaining time
                const remainingSlots = endSlot.sub(currentSlotBn).toNumber();
                const remainingTimeSeconds = remainingSlots * 0.4; // Assuming SLOT_TIME_MS = 400
                const minutes = Math.floor(remainingTimeSeconds / 60);
                const seconds = Math.floor(remainingTimeSeconds % 60);
                const timeLeftFormatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

                // Price calculation and amounts
                const bookkeepingData = getBookkeepingAccount.data;
                const marketData = getMarketAccount.data;

                let volume = amount.div(endSlot.sub(startSlot));
                let soldTokensBn = volume.mul(slot.sub(startSlot));
                let remainingAmountBn = amount.sub(soldTokensBn);

                let lastSlotBn = bookkeepingData.lastSlot.gt(endSlot)
                  ? endSlot
                  : bookkeepingData.lastSlot;

                let marketPrice = marketData.tokenAVolume // Swapped A and B for USDC -> SOL
                  .mul(new BN(VOLUME_PRECISION))
                  .div(
                    marketData.tokenBVolume.isZero()
                      ? new BN(1)
                      : marketData.tokenBVolume
                  ); // Avoid division by zero
                let swappedTokensMarket = volume
                  .mul(slot.sub(lastSlotBn).mul(marketPrice))
                  .div(new BN(VOLUME_PRECISION));
                let swappedTokensBook = bookkeepingData.aPerB // Used aPerB
                  .sub(bookkeeping)
                  .mul(volume)
                  .div(new BN(BOOKKEEPING_PRECISION));
                let swappedTokensBn =
                  swappedTokensBook.add(swappedTokensMarket);

                const remainingAmount =
                  remainingAmountBn.toNumber() / 10 ** USDC_DECIMALS;
                const swappedAmount =
                  swappedTokensBn.toNumber() / 10 ** SOL_DECIMALS;

                // Format average price
                const avgPriceNum = soldTokensBn // Swapped calculation for USDC/SOL vs SOL/USDC
                  .mul(new BN(VOLUME_PRECISION))
                  .mul(new BN(10 ** SOL_DECIMALS)) // Using SOL for 'to' token
                  .div(swappedTokensBn.isZero() ? new BN(1) : swappedTokensBn) // Avoid division by zero
                  .div(new BN(10 ** USDC_DECIMALS)); // Using USDC for 'from' token
                const formattedAvgPrice = avgPriceNum
                  .div(new BN(VOLUME_PRECISION))
                  .toNumber()
                  .toFixed(4);

                // Format amounts
                const amountUsdc =
                  (Number(amount.toString()) / 10 ** USDC_DECIMALS).toFixed(2) +
                  " USDC";
                const amountSol =
                  (
                    (Number(amount.toString()) / 10 ** USDC_DECIMALS) *
                    ((Number(bookkeepingData.aPerB.toString()) / // Used aPerB
                      (VOLUME_PRECISION * VOLUME_PRECISION)) * // Adjusted for aPerB precision
                      (10 ** USDC_DECIMALS / 10 ** SOL_DECIMALS))
                  ) // Adjust for token decimals
                    .toFixed(4) + " SOL";

                return (
                  <PositionCard
                    key={data.publicKey.toString()}
                    id={id.toString()}
                    tokens={{
                      from: "USDC",
                      to: "SOL",
                      fromIcon: "/usd-coin-usdc-logo.png",
                      toIcon: "/solana-sol-logo.png",
                    }}
                    remainingAmount={remainingAmount}
                    swappedAmount={swappedAmount}
                    amountFrom={amountUsdc}
                    amountTo={amountSol}
                    avgPrice={formattedAvgPrice}
                    duration={`${Math.floor((totalDuration * 0.4) / 60)}m`}
                    progress={progressPercentage}
                    status="Active"
                    timeLeft={timeLeftFormatted}
                    onClose={() => closePositionB.mutate(id)}
                  />
                );
              })}
          </>
        )}

        {/* Show a message if there are no active positions */}
        {activePositionsA.length === 0 && activePositionsB.length === 0 && (
          <div className="w-full text-center py-8">
            <p className="text-[#E9F6F3] text-sm">No active positions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
