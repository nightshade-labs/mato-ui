"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Form } from "@/components/ui/form";

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
import { cn } from "@/lib/utils";

// Import extracted components
import { TokenSelector } from "./token-selector";
import { PercentageButton } from "./percentage-button";
import { TokenInputBlock } from "./token-input-block";
import { SwitchArrow } from "./switch-arrow";
import { DurationSelector } from "./duration-selector";
import { ControlButtons } from "./control-buttons";
import { PriceImpactDisplay } from "./price-impact-display";
import { ProtectionStatus } from "./protection-status";

const SwapFormSchema = z.object({
  amount: z.number().gt(0, "Must be greater than zero"),
  duration: z.string({
    required_error: "Please set a duration",
  }),
});

export type TokenData = {
  symbol: string;
  image: string;
};

// Main component
export function SwapPanel() {
  const { depositTokenA, depositTokenB } = useMatoProgram();
  const [isChartVisible, setIsChartVisible] = useState(true);
  const provider = useAnchorProvider();

  const getBalance = useGetBalance({ address: provider.publicKey });
  const getTokenBalance = useGetTokenBalance({
    address: provider.publicKey,
    mintAddress: USDC_MINT,
  });

  const form = useForm<z.infer<typeof SwapFormSchema>>({
    resolver: zodResolver(SwapFormSchema),
    defaultValues: {
      duration: "10min",
      amount: 0,
    },
  });

  const amount = useWatch({
    control: form.control,
    defaultValue: 0,
    name: "amount",
  });

  async function onSubmit(data: z.infer<typeof SwapFormSchema>) {
    let slotDuration = durationStringToSlots.get(data.duration);
    // Handle both token types in a single transaction based on the input/output
    depositTokenA.mutate({
      amount: data.amount * LAMPORTS_PER_SOL,
      duration: slotDuration || 30,
    });
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

  // Token data definitions
  const solToken: TokenData = {
    symbol: "SOL",
    image: "/solana-sol-logo.png",
  };

  const usdcToken: TokenData = {
    symbol: "USDC",
    image: "/usd-coin-usdc-logo.png",
  };

  const estimatedUsd = amount * 98; // Mock calculation

  // Percentage buttons for SOL token
  const renderSolPercentageButtons = () =>
    getBalance.data !== undefined && (
      <div className="flex gap-1 items-center">
        <PercentageButton
          percent="25%"
          onClick={() => {
            form.setValue(
              "amount",
              Number((getBalance.data / LAMPORTS_PER_SOL / 4).toFixed(9))
            );
          }}
        />
        <PercentageButton
          percent="50%"
          onClick={() => {
            form.setValue(
              "amount",
              Number((getBalance.data / LAMPORTS_PER_SOL / 2).toFixed(9))
            );
          }}
        />
        <PercentageButton
          percent="Max"
          onClick={() => {
            form.setValue(
              "amount",
              Number((getBalance.data / LAMPORTS_PER_SOL - 0.003).toFixed(9))
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              {/* Sell Section */}
              <TokenInputBlock
                title="Sell"
                balance={
                  <AccountBalance
                    address={provider.publicKey}
                    classname="text-sm"
                  />
                }
                amount={amount}
                usdValue={`$${estimatedUsd.toFixed(2)}`}
                token={solToken}
                isInput={true}
                percentageButtons={renderSolPercentageButtons()}
                form={form}
                fieldName="amount"
              />

              <SwitchArrow />

              {/* Buy Section */}
              <TokenInputBlock
                title="Buy"
                balance={
                  <AccountTokenBalance
                    address={provider.publicKey}
                    mintAddress={USDC_MINT}
                    decimals={4}
                    classname="text-sm"
                  />
                }
                amount={(amount * 98).toFixed(2)} // Mock conversion calculation
                usdValue={`$${(amount * 98).toFixed(2)}`}
                token={usdcToken}
                isInput={false}
              />
            </div>

            {/* Duration and Price Impact Section */}
            <div className="bg-[#0A352B] rounded-lg p-3">
              <DurationSelector form={form} />

              {/* Price Impact Section */}
              <PriceImpactDisplay price="146.06 USDC" percentage="+3.98%" />

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
              {provider.publicKey ? "Swap" : "Connect Wallet"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
