import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export function BuySellSwitch({
  side,
  setSide,
}: {
  side: "buy" | "sell";
  setSide: (side: "buy" | "sell") => void;
}) {
  return (
    <div className="flex justify-between">
      <Button
        variant={"ghost"}
        onClick={() => setSide("buy")}
        className={cn(
          side == "buy"
            ? "text-purple-500 hover:text-purple-500"
            : "hover:text-purple-300",
          "flex-1 rounded-l-xl rounded-r-none bg-opacity-20 hover:bg-transparent"
        )}
      >
        <div className="relative">
          Buy
          {side == "buy" && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-purple-500/90 to-red-500/90"></div>
          )}
        </div>
      </Button>
      <Button
        variant={"ghost"}
        onClick={() => setSide("sell")}
        className={cn(
          side == "sell"
            ? " text-purple-500 hover:text-purple-500"
            : "hover:text-purple-300",
          "flex-1 rounded-r-xl rounded-l-none bg-opacity-20 hover:bg-transparent"
        )}
      >
        <div className="relative">
          Sell
          {side == "sell" && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-red-500/90 to-purple-500/90"></div>
          )}
        </div>
      </Button>
    </div>
  );
}
