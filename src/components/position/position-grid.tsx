import React from "react";
import { PositionCard } from "./position-card";

type Position = {
  id: string;
  tokens: {
    from: string;
    to: string;
    fromIcon: any;
    toIcon: any;
  };
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
  onClose?: () => void;
  statusTooltip?: string;
  timeLeft?: string;
};

type PositionsGridProps = {
  positions: Position[];
};

export function PositionsGrid({ positions }: PositionsGridProps) {
  if (!positions || positions.length === 0) {
    return (
      <div className="w-full py-10 flex justify-center items-center">
        <p className="text-sm text-[#E9F6F3]">No active positions found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full p-2.5">
      {positions.map((position) => (
        <PositionCard
          key={position.id}
          id={position.id}
          tokens={position.tokens}
          amountFrom={position.amountFrom}
          amountTo={position.amountTo}
          avgPrice={position.avgPrice}
          duration={position.duration}
          progress={position.progress}
          status={position.status}
          timeLeft={position.timeLeft}
          onClose={position.onClose}
        />
      ))}
    </div>
  );
}
