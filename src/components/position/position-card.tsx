import React from "react";
import Image from "next/image";
import { ArrowRight, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

type TokensType = {
  from: string;
  to: string;
  fromIcon: any;
  toIcon: any;
};

type PositionCardProps = {
  id: string;
  tokens: TokensType;
  amountFrom: string;
  amountTo: string;
  avgPrice: string;
  duration: string;
  remainingAmount: number;
  swappedAmount: number;
  progress: number;
  status: "Active" | "Successful" | "Canceled" | "Failed";
  timeLeft?: string;
  onClose?: () => void;
};

export function PositionCard({
  tokens,
  amountFrom,
  amountTo,
  avgPrice,
  remainingAmount,
  swappedAmount,
  duration,
  progress,
  status,
  timeLeft,
  onClose,
}: PositionCardProps) {
  // Parse amount strings to remove token symbols for display
  const fromAmount = amountFrom.split(" ")[0];
  const toAmount = amountTo.split(" ")[0];

  // Calculate sell progress percentage (just using progress value)
  const sellProgress = 100 - progress;

  // Calculate buy progress (for demo, using the same progress)
  const buyProgress = progress;

  // Determine styles based on status
  const getStatusStyles = () => {
    switch (status) {
      case "Successful":
        return {
          statusColor: "text-[#1CF6C2]",
          progressBarBg: "bg-[#109071]",
          progressBarFill: "bg-[#1CF6C2]",
          iconGradient: "from-[#1CF6C2] to-[#102924]",
          arrowColor: "stroke-[#A7EEDD]",
          valueColor: "text-white",
        };
      case "Canceled":
        return {
          statusColor: "text-[#E9F6F3]",
          progressBarBg: "bg-[#FFA6A6]",
          progressBarFill: "bg-[#FF4D4D]",
          iconGradient: "from-[#FF2121] to-[#FFA6A6]",
          arrowColor: "stroke-[#FFA6A6]",
          valueColor: "text-white",
        };
      case "Failed":
        return {
          statusColor: "text-[#FFA6A6]",
          progressBarBg: "bg-[#FFA6A6]",
          progressBarFill: "bg-[#FF4D4D]",
          iconGradient: "from-[#FF2121] to-[#FFA6A6]",
          arrowColor: "stroke-[#FFA6A6]",
          valueColor: "text-white",
        };
      default: // Active
        return {
          statusColor: "text-[#1CF6C2]",
          progressBarBg: "bg-[#109071]",
          progressBarFill: "bg-[#1CF6C2]",
          iconGradient: "from-[#1CF6C2] to-[#102924]",
          arrowColor: "stroke-[#A7EEDD]",
          valueColor: "text-white",
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#0A352B] rounded-lg p-2.5 flex flex-col gap-[18px] w-full flex-1 min-w-[250px]"
    >
      {/* Top wrapper */}
      <div className="flex justify-between items-center w-full gap-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-[#E9F6F3]">
              {tokens.from}
            </span>
            <div className="w-4 h-4 flex items-center justify-center">
              <ArrowRight className={styles.arrowColor} size={16} />
            </div>
            <span className="text-xs font-bold text-[#E9F6F3]">
              {tokens.to}
            </span>
          </div>
          <span className={`text-xs font-medium ${styles.statusColor}`}>
            [{status}]
          </span>
        </div>

        {onClose && (
          <Button
            onClick={onClose}
            className="py-0 px-2 rounded-sm text-destructive-80 border-destructive-80 hover:border-destructive-60 hover:text-destructive-60 opacity-90  h-6 flex items-center justify-center"
            aria-label="Close position"
            variant={"outline"}
            size={"sm"}
          >
            Close
          </Button>
        )}
      </div>

      {/* Progress sections */}
      <div className="flex flex-col w-full gap-3">
        {/* Sell progress */}
        <div className="flex flex-col w-full gap-1">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full p-[1px] bg-gradient-to-br ${styles.iconGradient}`}
              >
                <div className="w-full h-full rounded-full overflow-hidden">
                  <Image
                    src={tokens.fromIcon}
                    alt={tokens.from}
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className={`text-xs font-bold ${styles.valueColor}`}>
                Selling {tokens.from}
              </span>
            </div>
            <span className={`text-xs font-bold ${styles.valueColor}`}>
              {remainingAmount.toFixed(4)}
            </span>
          </div>
          <div className={`w-full ${styles.progressBarBg} rounded-lg h-2`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${sellProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`${styles.progressBarFill} h-full rounded-l-lg border-r border-[#0A352B]`}
            />
          </div>
        </div>

        {/* Buy progress */}
        <div className="flex flex-col w-full gap-1">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full p-[1px] bg-gradient-to-br ${styles.iconGradient}`}
              >
                <div className="w-full h-full rounded-full overflow-hidden">
                  <Image
                    src={tokens.toIcon}
                    alt={tokens.to}
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className={`text-xs font-bold ${styles.valueColor}`}>
                Buying {tokens.to}
              </span>
            </div>
            <span className={`text-xs font-bold ${styles.valueColor}`}>
              {swappedAmount.toFixed(4)}
            </span>
          </div>
          <div className={`w-full ${styles.progressBarBg} rounded-lg h-2`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${buyProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`${styles.progressBarFill} h-full rounded-l-lg border-r border-[#0A352B]`}
            />
          </div>
        </div>
      </div>

      {/* Info wrapper */}
      <div className="flex flex-col w-full gap-2.5">
        {/* Time left */}
        <div className="flex items-center w-full gap-1 flex-wrap">
          <span className="text-xs font-bold text-[#E9F6F3]">Time Left:</span>
          <span className={`text-xs font-medium ${styles.statusColor}`}>
            {timeLeft || "0m 00s"}
          </span>
        </div>

        {/* Average price */}
        <div className="flex items-center w-full gap-1 flex-wrap">
          <span className="text-xs font-bold text-[#E9F6F3]">Avg Price:</span>
          <span
            className={`text-xs font-medium ${status === "Canceled" ? "text-[#1CF6C2]" : styles.statusColor}`}
          >
            {avgPrice}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
