"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { BN } from "@coral-xyz/anchor";
import { useMatoProgram } from "../mato/mato-data-access";
import { useGetSlot } from "../cluster/cluster-data-access";
import { PositionsTable } from "@/components/ui/PositionsTable";
import { Download, LayoutGrid, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import TokenSolIcon from "../../../public/solana-sol-logo.png";
import TokenUsdcIcon from "../../../public/usd-coin-usdc-logo.png";
import { BOOKKEEPING_PRECISION, VOLUME_PRECISION } from "@/lib/constants";
import { mkConfig, generateCsv, download } from "export-to-csv";
import { PositionsGrid } from "./position-grid";
import { motion, AnimatePresence } from "motion/react";

// Helper to format BN to string with decimals
const formatTokenAmount = (
  amountBn: BN,
  decimals: number,
  displayDecimals: number = 2
): string => {
  if (!amountBn) return "0.00";
  const amount = Number(amountBn.toString()) / 10 ** decimals;
  return amount.toFixed(displayDecimals);
};

// Helper to format price
const formatPrice = (
  priceBn: BN,
  baseDecimals: number,
  quoteDecimals: number,
  displayDecimals: number = 4
): string => {
  if (!priceBn) return "0.00";
  const val =
    Number(priceBn.toString()) / (VOLUME_PRECISION * VOLUME_PRECISION);
  const price = (val * 10 ** baseDecimals) / 10 ** quoteDecimals;
  return price.toFixed(displayDecimals);
};

// Helper to format slot duration
const SLOT_TIME_MS = 400; // Approximate slot time
const formatSlotDuration = (startSlotBn: BN, endSlotBn: BN): string => {
  if (!startSlotBn || !endSlotBn) return "N/A";
  const durationSlots = endSlotBn.sub(startSlotBn).toNumber();
  if (durationSlots < 0) return "N/A"; // Should not happen
  const durationSeconds = durationSlots * (SLOT_TIME_MS / 1000);
  if (durationSeconds < 60) return `${Math.round(durationSeconds)}s`;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60);
  return `${minutes}m ${seconds}s`;
};

// Helper to format remaining time
const formatRemainingTime = (remainingSlots: number): string => {
  if (remainingSlots <= 0) return "0m 00s";
  const remainingTimeSeconds = remainingSlots * (SLOT_TIME_MS / 1000);
  const minutes = Math.floor(remainingTimeSeconds / 60);
  const seconds = Math.floor(remainingTimeSeconds % 60);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
};

// Reference epoch for Solana Mainnet Beta (March 16, 2020, 00:00:00 UTC)
const SOLANA_MAINNET_GENESIS_EPOCH_MS = 1584316800000;

// Placeholder for formatting slot to date string - replace with actual logic if available
const formatSlotToDateTime = (slotBn: BN | undefined): string => {
  if (!slotBn) return "N/A";

  const slotNumber = slotBn.toNumber();
  // Calculate estimated timestamp
  const estimatedTimestamp =
    slotNumber * SLOT_TIME_MS + SOLANA_MAINNET_GENESIS_EPOCH_MS;

  const date = new Date(estimatedTimestamp);

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Pad minutes with a leading zero if necessary
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();

  return `${month} ${day}, ${hours}:${formattedMinutes}`;
};

const SOL_DECIMALS = 9;
const USDC_DECIMALS = 6;

export default function PositionsFeature() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  const [tickCount, setTickCount] = useState(0); // State to trigger re-renders for timer updates

  const {
    getAllPositionA,
    getAllPositionB,
    closePositionA,
    closePositionB,
    getBookkeepingAccount,
    getMarketAccount,
  } = useMatoProgram();

  const getSlot = useGetSlot();
  const currentSlot = getSlot.data ? new BN(getSlot.data) : undefined;

  // Set up refetch interval to update the positions data
  useEffect(() => {
    // Refetch positions every 10 seconds
    const refetchInterval = setInterval(() => {
      getAllPositionA.refetch();
      getAllPositionB.refetch();
      getSlot.refetch();
    }, 10000);

    return () => clearInterval(refetchInterval);
  }, [getAllPositionA, getAllPositionB, getSlot]);

  // Set up timer interval to update countdown timers every second
  useEffect(() => {
    // Update time counters every second
    const timerInterval = setInterval(() => {
      setTickCount((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const transformedPositions = React.useMemo(() => {
    if (!currentSlot || !getBookkeepingAccount.data || !getMarketAccount.data) {
      return [];
    }

    const bookkeepingData = getBookkeepingAccount.data;
    const marketData = getMarketAccount.data;
    // Define Position type based on transformation for clarity if not imported
    type TransformedPosition = {
      id: string;
      tokens: { from: string; to: string; fromIcon: any; toIcon: any };
      remainingAmount: number;
      swappedAmount: number;
      amountFrom: string;
      amountTo: string;
      avgPrice: string;
      duration: string;
      progress: number;
      estSavings: string;
      status: "Active" | "Successful" | "Canceled" | "Failed";
      startTime: string;
      endTime: string;
      positionId: string;
      timeLeft?: string;
      onClose?: () => void;
      statusTooltip?: string;
      endSlot?: number;
    };

    const allPositionsData: TransformedPosition[] = [];

    if (getAllPositionA.data) {
      getAllPositionA.data.forEach((posA) => {
        const { account: posData, publicKey } = posA;
        const fromToken = "SOL";
        const toToken = "USDC";
        const fromDecimals = SOL_DECIMALS;
        const toDecimals = USDC_DECIMALS;

        const amountFromNum =
          Number(posData.amount.toString()) / 10 ** fromDecimals;
        const avgPriceForCalc =
          (Number(bookkeepingData.bPerA.toString()) /
            (VOLUME_PRECISION * VOLUME_PRECISION)) *
          (10 ** fromDecimals / 10 ** toDecimals);
        const amountToNum = amountFromNum * avgPriceForCalc;

        const totalDurationSlots = posData.endSlot
          .sub(posData.startSlot)
          .toNumber();
        const elapsedSlots = currentSlot.gt(posData.endSlot)
          ? totalDurationSlots
          : Math.max(0, currentSlot.sub(posData.startSlot).toNumber());
        const progress =
          totalDurationSlots > 0
            ? Math.min(100, (elapsedSlots / totalDurationSlots) * 100)
            : currentSlot.gte(posData.endSlot)
              ? 100
              : 0;

        let status: "Active" | "Successful" | "Canceled" | "Failed" = "Active";
        if (currentSlot.gte(posData.endSlot)) {
          status = "Successful";
        }

        // Calculate remaining time for active positions
        const remainingSlots = currentSlot.gte(posData.endSlot)
          ? 0
          : posData.endSlot.toNumber() - currentSlot.toNumber();

        // For active positions, calculate time remaining
        const timeLeft =
          status === "Active" ? formatRemainingTime(remainingSlots) : undefined;

        // Price calculation
        let slot =
          currentSlot.toNumber() > posData.endSlot.toNumber()
            ? posData.endSlot
            : new BN(currentSlot);
        let amount = posData.amount;
        let volume = amount.div(posData.endSlot.sub(posData.startSlot));
        let soldTokens = volume.mul(slot.sub(posData.startSlot));
        let remainingAmount = amount.sub(soldTokens);

        let lastSlot =
          bookkeepingData.lastSlot.toNumber() > posData.endSlot.toNumber()
            ? posData.endSlot
            : bookkeepingData.lastSlot;
        let marketPrice = marketData.tokenBVolume
          .mul(new BN(VOLUME_PRECISION))
          .div(marketData.tokenAVolume);
        let bookkeeping = posData.bookkeeping;
        let swappedTokensMarket = volume
          .mul(slot.sub(lastSlot).mul(marketPrice))
          .div(new BN(VOLUME_PRECISION));
        let swappedTokensBook = bookkeepingData.bPerA
          .sub(bookkeeping)
          .mul(volume)
          .div(new BN(BOOKKEEPING_PRECISION));
        let swappedTokens = swappedTokensBook.add(swappedTokensMarket);

        let averagePrice = swappedTokens
          .mul(new BN(VOLUME_PRECISION))
          .mul(new BN(10 ** SOL_DECIMALS))
          .div(soldTokens)
          .div(new BN(10 ** USDC_DECIMALS));

        allPositionsData.push({
          id: publicKey.toString(),
          tokens: {
            from: fromToken,
            to: toToken,
            fromIcon: TokenSolIcon,
            toIcon: TokenUsdcIcon,
          },
          remainingAmount: remainingAmount.toNumber() / 10 ** SOL_DECIMALS,
          swappedAmount: swappedTokens.toNumber() / 10 ** USDC_DECIMALS,
          amountFrom: `${formatTokenAmount(posData.amount, fromDecimals)} ${fromToken}`,
          amountTo: `~${amountToNum.toFixed(toDecimals)} ${toToken}`,
          // avgPrice: `${formatPrice(bookkeepingData.bPerA, fromDecimals, toDecimals)} ${toToken}/${fromToken}`,
          avgPrice: (averagePrice.toNumber() / VOLUME_PRECISION).toFixed(4),
          duration: formatSlotDuration(posData.startSlot, posData.endSlot),
          progress: Math.round(progress),
          estSavings: "N/A", // Placeholder
          status: status,
          startTime: formatSlotToDateTime(posData.startSlot),
          endTime: formatSlotToDateTime(posData.endSlot),
          positionId: `#${posData.id.toString()}`,
          timeLeft,
          endSlot: posData.endSlot.toNumber(),
          onClose:
            status === "Active"
              ? () => closePositionA.mutate(posData.id)
              : undefined,
        });
      });
    }

    if (getAllPositionB.data) {
      getAllPositionB.data.forEach((posB) => {
        const { account: posData, publicKey } = posB;
        const fromToken = "USDC";
        const toToken = "SOL";
        const fromDecimals = USDC_DECIMALS;
        const toDecimals = SOL_DECIMALS;

        const amountFromNum =
          Number(posData.amount.toString()) / 10 ** fromDecimals;
        const avgPriceForCalc =
          (Number(bookkeepingData.aPerB.toString()) /
            (VOLUME_PRECISION * VOLUME_PRECISION)) *
          (10 ** fromDecimals / 10 ** toDecimals);
        const amountToNum = amountFromNum * avgPriceForCalc;

        const totalDurationSlots = posData.endSlot
          .sub(posData.startSlot)
          .toNumber();
        const elapsedSlots = currentSlot.gt(posData.endSlot)
          ? totalDurationSlots
          : Math.max(0, currentSlot.sub(posData.startSlot).toNumber());
        const progress =
          totalDurationSlots > 0
            ? Math.min(100, (elapsedSlots / totalDurationSlots) * 100)
            : currentSlot.gte(posData.endSlot)
              ? 100
              : 0;

        let status: "Active" | "Successful" | "Canceled" | "Failed" = "Active";
        if (currentSlot.gte(posData.endSlot)) {
          status = "Successful";
        }

        // Calculate remaining time for active positions
        const remainingSlots = currentSlot.gte(posData.endSlot)
          ? 0
          : posData.endSlot.toNumber() - currentSlot.toNumber();

        // For active positions, calculate time remaining
        const timeLeft =
          status === "Active" ? formatRemainingTime(remainingSlots) : undefined;

        // Price calculation
        let slot =
          currentSlot.toNumber() > posData.endSlot.toNumber()
            ? posData.endSlot
            : new BN(currentSlot);
        let amount = posData.amount;
        let volume = amount.div(posData.endSlot.sub(posData.startSlot));
        let soldTokens = volume.mul(slot.sub(posData.startSlot));
        let remainingAmount = amount.sub(soldTokens);

        let lastSlot =
          bookkeepingData.lastSlot.toNumber() > posData.endSlot.toNumber()
            ? posData.endSlot
            : bookkeepingData.lastSlot;
        let marketPrice = marketData.tokenAVolume
          .mul(new BN(VOLUME_PRECISION))
          .div(marketData.tokenBVolume);
        let bookkeeping = posData.bookkeeping;
        let swappedTokensMarket = volume
          .mul(slot.sub(lastSlot).mul(marketPrice))
          .div(new BN(VOLUME_PRECISION));
        let swappedTokensBook = bookkeepingData.aPerB
          .sub(bookkeeping)
          .mul(volume)
          .div(new BN(BOOKKEEPING_PRECISION));
        let swappedTokens = swappedTokensBook.add(swappedTokensMarket);

        let averagePrice = soldTokens
          .mul(new BN(VOLUME_PRECISION))
          .mul(new BN(10 ** SOL_DECIMALS))
          .div(swappedTokens)
          .div(new BN(10 ** USDC_DECIMALS));

        allPositionsData.push({
          id: publicKey.toString(),
          tokens: {
            from: fromToken,
            to: toToken,
            fromIcon: TokenUsdcIcon,
            toIcon: TokenSolIcon,
          },
          remainingAmount: remainingAmount.toNumber() / 10 ** USDC_DECIMALS,
          swappedAmount: swappedTokens.toNumber() / 10 ** SOL_DECIMALS,
          amountFrom: `${formatTokenAmount(posData.amount, fromDecimals)} ${fromToken}`,
          amountTo: `~${amountToNum.toFixed(toDecimals)} ${toToken}`,
          avgPrice: (averagePrice.toNumber() / VOLUME_PRECISION).toFixed(4),
          // avgPrice: `${formatPrice(bookkeepingData.aPerB, fromDecimals, toDecimals)} ${toToken}/${fromToken}`,
          duration: formatSlotDuration(posData.startSlot, posData.endSlot),
          progress: Math.round(progress),
          estSavings: "N/A", // Placeholder
          status: status,
          startTime: formatSlotToDateTime(posData.startSlot),
          endTime: formatSlotToDateTime(posData.endSlot),
          positionId: `#${posData.id.toString()}`,
          timeLeft,
          endSlot: posData.endSlot.toNumber(),
          onClose:
            status === "Active"
              ? () => closePositionB.mutate(posData.id)
              : undefined,
        });
      });
    }
    return allPositionsData;
  }, [
    currentSlot,
    getAllPositionA.data,
    getAllPositionB.data,
    getBookkeepingAccount.data,
    closePositionA,
    closePositionB,
    tickCount, // Added tick count to ensure re-renders for time updates
  ]);

  const handleExportCsv = () => {
    if (!transformedPositions || transformedPositions.length === 0) {
      console.warn("No data to export.");
      // Optionally, show a user notification here (e.g., using a toast library)
      return;
    }

    const dataForCsv = transformedPositions.map((p) => ({
      "Position ID": p.positionId,
      "Tokens (From/To)": `${p.tokens.from}/${p.tokens.to}`,
      "Amount (From)": p.amountFrom,
      "Amount (To)": p.amountTo,
      "Avg. Price": p.avgPrice,
      Duration: p.duration, // Changed key to "Duration" from "Duration"
      "Progress (%)": p.progress,
      Status: p.status, // Changed key to "Status" from "Status"
      "Start Time": p.startTime,
      "End Time": p.endTime,
    }));

    const csvConfig = mkConfig({
      filename: "current_positions.csv", // Added .csv extension
      showColumnHeaders: true,
      useKeysAsHeaders: true, // Use keys from dataForCsv as headers
    });

    const csv = generateCsv(csvConfig)(dataForCsv);
    download(csvConfig)(csv);
  };

  return (
    <div className="bg-[#102924] mt-14 rounded-lg p-2.5 space-y-3">
      <div className="bg-[#0A352B] rounded-lg p-2.5 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-[#E9F6F3]">
          Current Positions
        </h3>

        <div className="flex items-center gap-2">
          {/* View toggle buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 ${
                viewMode === "table"
                  ? "bg-[#102924] border border-[#1CF6C2]"
                  : "bg-[#102924] border border-[#053A2D] hover:bg-[#1a493f]"
              }`}
              aria-label="Table view"
              tabIndex={0}
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 ${
                viewMode === "grid"
                  ? "bg-[#102924] border border-[#1CF6C2]"
                  : "bg-[#102924] border border-[#053A2D] hover:bg-[#1a493f]"
              }`}
              aria-label="Grid view"
              tabIndex={0}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="outline"
            className="bg-[#102924] border-[#053A2D] hover:bg-[#1a493f] text-[#E9F6F3] text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1"
            onClick={handleExportCsv}
            aria-label="Export current positions as CSV"
            tabIndex={0}
            disabled={transformedPositions.length === 0} // Disable if no positions
          >
            <Download className="h-3 w-3 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div>
        <AnimatePresence mode="wait">
          {viewMode === "table" ? (
            <motion.div
              key="table-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PositionsTable positions={transformedPositions} />
            </motion.div>
          ) : (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PositionsGrid positions={transformedPositions} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
