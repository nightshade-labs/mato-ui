import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { motion } from "motion/react";

const SwapTabs = ({
  side,
  setSide,
}: {
  side: "buy" | "sell";
  setSide: (side: "buy" | "sell") => void;
}) => {
  return (
    <Tabs
      defaultValue={side}
      value={side}
      onValueChange={(value) => setSide(value as "buy" | "sell")}
      className="w-full"
    >
      <TabsList className="flex justify-between bg-[#0A352B] p-1 rounded-xl overflow-hidden w-full h-12 border border-[#102924]/40">
        <TabsTrigger
          value="buy"
          className={cn(
            "flex-1 rounded-lg bg-opacity-20 font-medium transition-all duration-200 ease-out",
            "hover:bg-[#102924]/50 data-[state=active]:shadow-none relative",
            side === "buy"
              ? "text-[#1CF6C2] data-[state=active]:bg-[#102924]/80"
              : "text-[#E9F6F3] hover:text-[#1CF6C2]/80"
          )}
        >
          <div className="relative px-2 py-1">
            <motion.span
              animate={{
                scale: side === "buy" ? 1.05 : 1,
                fontWeight: side === "buy" ? 600 : 400,
              }}
              transition={{ duration: 0.2 }}
            >
              Buy
            </motion.span>
            {side === "buy" && (
              <motion.div
                layoutId="swap-tab-indicator"
                className="absolute -bottom-1 left-0 right-0 h-0.5 mx-auto w-12 bg-gradient-to-r from-[#1CF6C2] to-[#1CF6C2]/60"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
          </div>
        </TabsTrigger>
        <TabsTrigger
          value="sell"
          className={cn(
            "flex-1 rounded-lg bg-opacity-20 font-medium transition-all duration-200 ease-out",
            "hover:bg-[#102924]/50 data-[state=active]:shadow-none relative",
            side === "sell"
              ? "text-[#1CF6C2] data-[state=active]:bg-[#102924]/80"
              : "text-[#E9F6F3] hover:text-[#1CF6C2]/80"
          )}
        >
          <div className="relative px-2 py-1">
            <motion.span
              animate={{
                scale: side === "sell" ? 1.05 : 1,
                fontWeight: side === "sell" ? 600 : 400,
              }}
              transition={{ duration: 0.2 }}
            >
              Sell
            </motion.span>
            {side === "sell" && (
              <motion.div
                layoutId="swap-tab-indicator"
                className="absolute -bottom-1 left-0 right-0 h-0.5 mx-auto w-12 bg-gradient-to-r from-[#1CF6C2]/60 to-[#1CF6C2]"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
          </div>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export function BuySellSwitch({
  side,
  setSide,
}: {
  side: "buy" | "sell";
  setSide: (side: "buy" | "sell") => void;
}) {
  return <SwapTabs side={side} setSide={setSide} />;
}
