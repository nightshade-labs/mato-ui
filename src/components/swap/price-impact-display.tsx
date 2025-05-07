import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type PriceImpactDisplayProps = {
  price?: string;
  percentage?: string;
};

export const PriceImpactDisplay = ({
  price = "[Price]",
  percentage = "+0.0%",
}: PriceImpactDisplayProps) => (
  <div className="bg-[#102924] p-3 rounded-lg mb-3">
    <div className="flex justify-between mb-1">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-[#E9F6F3]">Price Impact</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-white">
                <Info size={12} className="text-[#40A68D]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                The difference between market price and estimated price due to
                trade size
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-[#E9F6F3]">{price}</span>
        <span className="text-xs font-medium text-[#1CF6C2]">{percentage}</span>
      </div>
    </div>
  </div>
);
