import { FormField, FormItem, FormMessage } from "../ui/form";
import { Info } from "lucide-react";
import { Input } from "../ui/input";
import { TokenData, TokenSelector } from "./token-selector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type TokenInputBlockProps = {
  title: string;
  balance: React.ReactNode;
  amount: number | string;
  usdValue: string;
  token: TokenData;
  isInput?: boolean;
  percentageButtons?: React.ReactNode;
  form?: any;
  fieldName?: string;
  error?: boolean;
  errorMessage?: string;
};

export const TokenInputBlock = ({
  title,
  balance,
  amount,
  usdValue,
  token,
  isInput = false,
  percentageButtons,
  form,
  fieldName,
  error = false,
  errorMessage,
}: TokenInputBlockProps) => (
  <motion.div
    layout
    transition={{
      layout: { duration: 0.3, ease: "easeOut" },
    }}
    className={cn(
      "bg-[#0A352B] mt-2 rounded-lg p-3 border",
      error ? "border-destructive bg-[#382424]" : "border-[#1CF6C2]/50"
    )}
  >
    <motion.div layout className="flex justify-between items-center mb-3">
      <motion.div
        layout
        className={`text-base font-semibold ${error ? "text-destructive-80" : ""} text-[#E9F6F3]`}
      >
        {title}
      </motion.div>
      <motion.div
        layout
        className={`flex gap-1 items-start ${error ? "text-destructive-40" : ""} text-[#109071]`}
      >
        <div className="flex items-center mr-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="19"
            height="19"
            viewBox="0 0 19 19"
            fill="none"
            className="mt-0.5"
          >
            <g clipPath="url(#clip0_172_2634)">
              <path
                d="M2.96875 4.15625V13.6562C2.96875 13.9712 3.09386 14.2732 3.31656 14.4959C3.53926 14.7186 3.84131 14.8438 4.15625 14.8438H16.0312C16.1887 14.8438 16.3397 14.7812 16.4511 14.6698C16.5624 14.5585 16.625 14.4075 16.625 14.25V5.9375C16.625 5.78003 16.5624 5.62901 16.4511 5.51766C16.3397 5.40631 16.1887 5.34375 16.0312 5.34375H4.15625C3.84131 5.34375 3.53926 5.21864 3.31656 4.99594C3.09386 4.77324 2.96875 4.47119 2.96875 4.15625ZM2.96875 4.15625C2.96875 3.84131 3.09386 3.53926 3.31656 3.31656C3.53926 3.09386 3.84131 2.96875 4.15625 2.96875H14.25"
                stroke={error ? "#FFA6A6" : "#109071"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.3594 10.5391C13.7693 10.5391 14.1016 10.2068 14.1016 9.79688C14.1016 9.38698 13.7693 9.05469 13.3594 9.05469C12.9495 9.05469 12.6172 9.38698 12.6172 9.79688C12.6172 10.2068 12.9495 10.5391 13.3594 10.5391Z"
                fill={error ? "#FFA6A6" : "#109071"}
              />
            </g>
            <defs>
              <clipPath id="clip0_172_2634">
                <rect width="19" height="19" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <span
            className={cn(
              "text-sm mt-0.5 ml-0.5",
              error ? "text-destructive-40" : "text-[#109071]"
            )}
          >
            {balance}
          </span>
        </div>
        {percentageButtons && (
          <div className="flex gap-1 mb-3">{percentageButtons}</div>
        )}
      </motion.div>
    </motion.div>

    <motion.div layout className="flex justify-between items-center">
      {isInput ? (
        <motion.div
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <FormField
            control={form.control}
            name={fieldName || "amount"}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <div className="flex flex-col">
                  <Input
                    className={cn(
                      "text-3xl font-medium bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:outline-none shadow-none",
                      error ? "text-destructive-80" : ""
                    )}
                    id={fieldName || "amount"}
                    placeholder="0"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(
                        isNaN(e.target.valueAsNumber)
                          ? 0
                          : e.target.valueAsNumber
                      )
                    }
                  />
                  <motion.div
                    layout
                    className={cn(
                      "text-xs font-medium",
                      error ? "text-destructive-80" : "text-[#109071]"
                    )}
                  >
                    {usdValue}
                  </motion.div>
                </div>
                {error && errorMessage ? (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive-80 text-xs mt-1"
                  >
                    {errorMessage}
                  </motion.div>
                ) : (
                  <FormMessage />
                )}
              </FormItem>
            )}
          />
        </motion.div>
      ) : (
        <motion.div
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col"
        >
          <motion.div
            layout
            className={cn(
              "text-3xl font-medium",
              error ? "text-destructive-80" : "text-[#9DA5A3]"
            )}
          >
            {amount}
          </motion.div>
          <motion.div
            layout
            className={cn(
              "text-xs font-medium",
              error ? "text-destructive-40" : "text-[#109071]"
            )}
          >
            {usdValue}
          </motion.div>
        </motion.div>
      )}

      <motion.div layout>
        <TokenSelector error={error} token={token} />
      </motion.div>
    </motion.div>

    {error && errorMessage && !isInput && (
      <motion.div
        layout
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-destructive-80 text-xs mt-2"
      >
        {errorMessage}
      </motion.div>
    )}
  </motion.div>
);
