import { Info } from "lucide-react";
import { FormControl, FormField, FormItem } from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type DurationSelectorProps = {
  form: any;
};

export const DurationSelector = ({ form }: DurationSelectorProps) => (
  <div className="bg-[#0A352B] rounded-lg p-3">
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center gap-1">
        <span className="text-base font-semibold text-[#E9F6F3]">Duration</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-white">
                <Info size={12} className="text-[#40A68D]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Your order is evenly distributed over this period of time
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>

    <FormField
      control={form.control}
      name="duration"
      render={({ field }) => (
        <FormItem className="mb-3">
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger className="bg-[#0A352B] border border-[#1CF6C2]/50 focus:ring-0 text-[#9DA5A3] font-bold">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="bg-[#102924] border border-[#1CF6C2]/50 text-white">
              <SelectItem value="5sec">5 seconds</SelectItem>
              <SelectItem value="1min">1 minute</SelectItem>
              <SelectItem value="10min">10 minutes</SelectItem>
              <SelectItem value="1hour">1 hour</SelectItem>
              <SelectItem value="1day">1 day</SelectItem>
              <SelectItem value="1week">1 week</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-[#109071] font-medium mt-1">
            Recommended duration: 10 minutes
          </div>
        </FormItem>
      )}
    />
  </div>
);
