"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { AccountBalance, AccountTokenBalance } from "../account/account-ui";
import { USDC_MINT } from "@/lib/constants";
import {
  useGetBalance,
  useGetTokenBalance,
} from "../account/account-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { durationStringToSlots } from "@/lib/utils";
import { useMatoProgram } from "../mato/mato-data-access";
import { BuySellSwitch } from "./swap-ui";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ArrowDown, Eye, Info, RefreshCw, Wallet } from "lucide-react";
import { PriceImpact } from "./price-impact";
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
import { cn } from "@/lib/utils";

const SwapFormSchema = z.object({
  amount: z.number().gt(0, "Must be greater than zero"),
  duration: z.string({
    required_error: "Please set a duration",
  }),
});

type TokenData = {
  symbol: string;
  image: string;
};

// Panel control buttons component
type ControlButtonsProps = {
  isChartVisible: boolean;
  toggleChart: () => void;
  resetForm: () => void;
};

const ControlButtons = ({
  isChartVisible,
  toggleChart,
  resetForm,
}: ControlButtonsProps) => {
  return (
    <div className="absolute right-0 top-0 -mt-10 flex gap-2">
      <button
        onClick={toggleChart}
        className="flex items-center gap-1 text-xs font-bold border border-[#053A2D] rounded-lg text-[#E9F6F3] py-2 px-3 bg-[#102924]"
      >
        <Eye size={16} />
        {isChartVisible ? "Hide Chart" : "Show Chart"}
      </button>
      <button
        onClick={resetForm}
        className="flex items-center gap-1 text-xs font-bold border border-[#053A2D] rounded-lg text-[#E9F6F3] py-2 px-3 bg-[#102924]"
      >
        <RefreshCw size={16} />
        Reset Amount
      </button>
    </div>
  );
};

// Percentage button component
type PercentageButtonProps = {
  percent: string;
  onClick: () => void;
};

const PercentageButton = ({ percent, onClick }: PercentageButtonProps) => (
  <button
    onClick={onClick}
    className="text-xs font-bold border border-[#109071] rounded text-[#109071] py-1 px-2 hover:bg-[#102924]/20"
  >
    {percent}
  </button>
);

// Token selector component
type TokenSelectorProps = {
  token: TokenData;
};

const TokenSelector = ({ token }: TokenSelectorProps) => (
  <div className="flex items-center gap-2 bg-[#102924] py-2 px-3 rounded-lg border border-[#1CF6C2]/50">
    <Avatar className="w-6 h-6 bg-[#0A352B] border border-[#1CF6C2]/40">
      <AvatarImage src={token.image} />
      <AvatarFallback>{token.symbol.substring(0, 1)}</AvatarFallback>
    </Avatar>
    <span className="text-white font-medium">{token.symbol}</span>
  </div>
);

// Token Input Block component
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
};

const TokenInputBlock = ({
  title,
  balance,
  amount,
  usdValue,
  token,
  isInput = false,
  percentageButtons,
  form,
  fieldName,
}: TokenInputBlockProps) => (
  <div className="bg-[#0A352B] mt-2 rounded-lg p-3 border border-[#1CF6C2]/50">
    <div className="flex justify-between items-center mb-3">
      <div className="text-base font-semibold text-[#E9F6F3]">{title}</div>
      <div className="flex gap-1 items-start text-[#109071]">
        <div className="flex items-center mr-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="19"
            height="19"
            viewBox="0 0 19 19"
            fill="none"
            className="mt-0.5"
          >
            <g clip-path="url(#clip0_172_2634)">
              <path
                d="M2.96875 4.15625V13.6562C2.96875 13.9712 3.09386 14.2732 3.31656 14.4959C3.53926 14.7186 3.84131 14.8438 4.15625 14.8438H16.0312C16.1887 14.8438 16.3397 14.7812 16.4511 14.6698C16.5624 14.5585 16.625 14.4075 16.625 14.25V5.9375C16.625 5.78003 16.5624 5.62901 16.4511 5.51766C16.3397 5.40631 16.1887 5.34375 16.0312 5.34375H4.15625C3.84131 5.34375 3.53926 5.21864 3.31656 4.99594C3.09386 4.77324 2.96875 4.47119 2.96875 4.15625ZM2.96875 4.15625C2.96875 3.84131 3.09386 3.53926 3.31656 3.31656C3.53926 3.09386 3.84131 2.96875 4.15625 2.96875H14.25"
                stroke="#109071"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M13.3594 10.5391C13.7693 10.5391 14.1016 10.2068 14.1016 9.79688C14.1016 9.38698 13.7693 9.05469 13.3594 9.05469C12.9495 9.05469 12.6172 9.38698 12.6172 9.79688C12.6172 10.2068 12.9495 10.5391 13.3594 10.5391Z"
                fill="#109071"
              />
            </g>
            <defs>
              <clipPath id="clip0_172_2634">
                <rect width="19" height="19" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <span className="text-sm mt-0.5 ml-0.5">{balance}</span>
        </div>
        {percentageButtons && (
          <div className="flex gap-1 mb-3">{percentageButtons}</div>
        )}
      </div>
    </div>

    <div className="flex justify-between items-center">
      {isInput ? (
        <div>
          <FormField
            control={form.control}
            name={fieldName || "amount"}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <div className="flex flex-col">
                  <Input
                    className="text-3xl  font-medium bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:outline-none shadow-none"
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
                  <div className="text-xs text-[#109071] font-medium">
                    {usdValue}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="text-3xl text-[#9DA5A3] font-medium">{amount}</div>
          <div className="text-xs text-[#109071] font-medium">{usdValue}</div>
        </div>
      )}

      <TokenSelector token={token} />
    </div>
  </div>
);

// Switch Arrow component
const SwitchArrow = () => (
  <div className="absolute left-1/2 top-[37%] transform -translate-x-1/2 translate-y-4 z-10 rounded-lg  bg-bg-80">
    <div className="w-10 h-10 flex items-center justify-center rounded-lg border-[0.5px] border-border relative">
      <div className="absolute top-[48%]  -left-1 z-10 transform  w-2 h-2 bg bg-bg-80"></div>
      <ArrowDown />
      <div className="absolute top-[48%]  -right-1 z-10 transform  w-2 h-2 bg bg-bg-80"></div>
    </div>
  </div>
);

// Duration selector component
type DurationSelectorProps = {
  form: any;
};

const DurationSelector = ({ form }: DurationSelectorProps) => (
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

// Price Impact component
const PriceImpactDisplay = () => (
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
        <span className="text-sm font-medium text-[#E9F6F3]">[Price]</span>
        <span className="text-xs font-medium text-[#1CF6C2]">+0.0%</span>
      </div>
    </div>
  </div>
);

// Protection Status component
const ProtectionStatus = () => (
  <div className="flex items-center gap-2">
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 6L9 17L4 12"
        stroke="#1CF6C2"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span className="text-xs text-[#109071] font-medium">
      Front-running protection always active
    </span>
  </div>
);

// Main component
export function SwapPanel() {
  const { depositTokenA, depositTokenB } = useMatoProgram();
  const [isChartVisible, setIsChartVisible] = useState(true);

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const provider = useAnchorProvider();

  const getBalance = useGetBalance({ address: provider.publicKey });
  const getTokenBalance = useGetTokenBalance({
    address: provider.publicKey,
    mintAddress: USDC_MINT,
  });

  const form = useForm<z.infer<typeof SwapFormSchema>>({
    resolver: zodResolver(SwapFormSchema),
    defaultValues: {
      duration: "1min",
    },
  });

  const amount = useWatch({
    control: form.control,
    defaultValue: 0,
    name: "amount",
  });

  async function onSubmit(data: z.infer<typeof SwapFormSchema>) {
    let slotDuration = durationStringToSlots.get(data.duration);
    if (side == "sell") {
      depositTokenA.mutate({
        amount: data.amount * LAMPORTS_PER_SOL,
        duration: slotDuration || 30,
      });
    } else {
      depositTokenB.mutate({
        amount: data.amount * 10 ** (getTokenBalance.data?.value.decimals || 6),
        duration: slotDuration || 30,
      });
    }
  }

  const resetForm = () => {
    form.reset({
      amount: 0,
      duration: form.getValues().duration,
    });
  };

  const toggleChart = () => {
    setIsChartVisible(!isChartVisible);
  };

  // Token data definition based on side
  const primaryToken: TokenData = {
    symbol: side === "sell" ? "SOL" : "USDC",
    image: side === "sell" ? "/solana-sol-logo.png" : "/usd-coin-usdc-logo.png",
  };

  const secondaryToken: TokenData = {
    symbol: side === "buy" ? "SOL" : "USDC",
    image: side === "buy" ? "/solana-sol-logo.png" : "/usd-coin-usdc-logo.png",
  };

  const estimatedUsd = amount * (side === "sell" ? 98 : 1); // Mock calculation

  // Percentage buttons for primary token
  const renderPercentageButtons = () =>
    getBalance.data !== undefined &&
    getTokenBalance.data !== undefined &&
    getTokenBalance.data !== null && (
      <div className="flex gap-1 items-center">
        <PercentageButton
          percent="25%"
          onClick={() => {
            side === "buy"
              ? form.setValue(
                  "amount",
                  Number(
                    (
                      parseInt(getTokenBalance.data?.value.amount || "0") /
                      10 ** (getTokenBalance.data?.value.decimals || 0) /
                      4
                    ).toFixed(6)
                  )
                )
              : form.setValue(
                  "amount",
                  Number((getBalance.data / LAMPORTS_PER_SOL / 4).toFixed(9))
                );
          }}
        />
        <PercentageButton
          percent="50%"
          onClick={() => {
            side === "buy"
              ? form.setValue(
                  "amount",
                  Number(
                    (
                      parseInt(getTokenBalance.data?.value.amount || "0") /
                      10 ** (getTokenBalance.data?.value.decimals || 0) /
                      2
                    ).toFixed(6)
                  )
                )
              : form.setValue(
                  "amount",
                  Number((getBalance.data / LAMPORTS_PER_SOL / 2).toFixed(9))
                );
          }}
        />
        <PercentageButton
          percent="Max"
          onClick={() => {
            side === "buy"
              ? form.setValue(
                  "amount",
                  Number(
                    (
                      parseInt(getTokenBalance.data?.value.amount || "0") /
                      10 ** (getTokenBalance.data?.value.decimals || 0)
                    ).toFixed(6)
                  )
                )
              : form.setValue(
                  "amount",
                  Number(
                    (getBalance.data / LAMPORTS_PER_SOL - 0.003).toFixed(9)
                  )
                );
          }}
        />
      </div>
    );

  return (
    <div className="relative w-full lg:w-fit">
      <ControlButtons
        isChartVisible={isChartVisible}
        toggleChart={toggleChart}
        resetForm={resetForm}
      />

      <div className="w-full lg:min-w-96 bg-[#102924] p-2.5 rounded-lg">
        <div className="mb-4">
          <BuySellSwitch side={side} setSide={setSide} />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              {/* Primary Token Input */}
              <TokenInputBlock
                title={side === "sell" ? "Sell" : "Buy"}
                balance={
                  side === "sell" ? (
                    <AccountBalance
                      address={provider.publicKey}
                      classname="text-sm"
                    />
                  ) : (
                    <AccountTokenBalance
                      address={provider.publicKey}
                      mintAddress={USDC_MINT}
                      decimals={4}
                      classname="text-sm"
                    />
                  )
                }
                amount={amount}
                usdValue={`$${estimatedUsd.toFixed(2)}`}
                token={primaryToken}
                isInput={true}
                percentageButtons={renderPercentageButtons()}
                form={form}
                fieldName="amount"
              />

              <SwitchArrow />

              {/* Secondary Token Display */}
              <TokenInputBlock
                title={side === "buy" ? "Buy" : "Sell"}
                balance="0"
                amount="0"
                usdValue="$0.00"
                token={secondaryToken}
                isInput={false}
              />
            </div>

            {/* Duration and Price Impact Section */}
            <div className="bg-[#0A352B] rounded-lg p-3">
              <DurationSelector form={form} />

              {/* Price Impact Section */}
              <PriceImpactDisplay />

              {/* Protection Status */}
              <ProtectionStatus />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className={cn(
                "w-full py-3 font-bold text-base",
                provider.publicKey
                  ? "bg-[#1CF6C2] text-[#091F1A] hover:brightness-110"
                  : "bg-[#1CF6C2] text-[#091F1A] hover:brightness-110"
              )}
            >
              {provider.publicKey
                ? side === "buy"
                  ? "Buy SOL"
                  : "Sell SOL"
                : "Connect Wallet"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
