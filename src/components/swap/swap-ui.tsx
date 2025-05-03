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
    <div className="flex justify-between bg-[#0A352B] p-1 rounded-lg overflow-hidden">
      <Button
        variant={"ghost"}
        onClick={() => setSide("buy")}
        className={cn(
          side == "buy"
            ? "text-[#1CF6C2] hover:text-[#1CF6C2]"
            : "text-[#E9F6F3] hover:text-white",
          "flex-1 rounded-md bg-opacity-20 hover:bg-[#102924]/20 font-semibold"
        )}
      >
        <div className="relative">
          Buy
          {side == "buy" && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-[#1CF6C2] to-[#1CF6C2]/70"></div>
          )}
        </div>
      </Button>
      <Button
        variant={"ghost"}
        onClick={() => setSide("sell")}
        className={cn(
          side == "sell"
            ? "text-[#1CF6C2] hover:text-[#1CF6C2]"
            : "text-[#E9F6F3] hover:text-white",
          "flex-1 rounded-md bg-opacity-20 hover:bg-[#102924]/20 font-semibold"
        )}
      >
        <div className="relative">
          Sell
          {side == "sell" && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-[#1CF6C2]/70 to-[#1CF6C2]"></div>
          )}
        </div>
      </Button>
    </div>
  );
}
