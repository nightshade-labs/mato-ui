"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";

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
import { BuySellSwitch } from "./swap-ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";

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
export function SwapPanel({
  setChartIsVisible,
}: {
  setChartIsVisible: (isVisible: boolean) => void;
}) {
  const { depositTokenA, depositTokenB } = useMatoProgram();
  const [isChartVisible, setIsChartVisible] = useState(true);
  const [inputError, setInputError] = useState(false);
  const [outputError, setOutputError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [swapSide, setSwapSide] = useState<"buy" | "sell">("buy");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const provider = useAnchorProvider();

  const getBalance = useGetBalance({ address: provider.publicKey });
  const getTokenBalance = useGetTokenBalance({
    address: provider.publicKey,
    mintAddress: USDC_MINT,
  });

  const buyForm = useForm<z.infer<typeof SwapFormSchema>>({
    resolver: zodResolver(SwapFormSchema),
    defaultValues: {
      duration: "10min",
      amount: 0,
    },
  });

  const sellForm = useForm<z.infer<typeof SwapFormSchema>>({
    resolver: zodResolver(SwapFormSchema),
    defaultValues: {
      duration: "10min",
      amount: 0,
    },
  });

  // Use the active form based on the swap side
  const activeForm = swapSide === "buy" ? buyForm : sellForm;

  const amount = useWatch({
    control: activeForm.control,
    defaultValue: 0,
    name: "amount",
  });

  // Validate amount against balance
  useEffect(() => {
    if (swapSide === "buy") {
      // For buy side, validate against USDC balance
      if (!getTokenBalance.data) return;

      const maxAmount = getTokenBalance.data?.value?.uiAmount || 0;

      if (amount < 0) {
        setInputError(true);
        setErrorMessage("Amount must be greater than zero");
      } else if (amount > maxAmount) {
        setInputError(true);
        setErrorMessage("Insufficient USDC balance");
      } else {
        setInputError(false);
        setErrorMessage("");
      }
    } else {
      // For sell side, validate against SOL balance
      if (!getBalance.data) return;

      const maxAmount = getBalance.data / LAMPORTS_PER_SOL - 0.003;

      if (amount < 0) {
        setInputError(true);
        setErrorMessage("Amount must be greater than zero");
      } else if (amount > maxAmount) {
        setInputError(true);
        setErrorMessage("Insufficient SOL balance");
      } else {
        setInputError(false);
        setErrorMessage("");
      }
    }

    // Output validation logic for liquidity checks
    if (swapSide === "buy") {
      // Example: Check if the SOL output would exceed available liquidity
      if (amount / 98 > 100) {
        // Assuming 100 SOL is the max available liquidity
        setOutputError(true);
      } else {
        setOutputError(false);
      }
    } else {
      // For sell side, check if the USDC output would exceed available liquidity
      if (amount * 98 > 10000) {
        // Assuming 10,000 USDC is the max available liquidity
        setOutputError(true);
      } else {
        setOutputError(false);
      }
    }
  }, [amount, getBalance.data, getTokenBalance.data, swapSide]);

  // Handle form collection but not submission
  function onSubmit(data: z.infer<typeof SwapFormSchema>) {
    if (inputError || outputError) {
      return;
    }
  }

  // Actual transaction execution function
  async function executeTransaction() {
    if (inputError || outputError || !provider.publicKey) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = activeForm.getValues();
      let slotDuration = durationStringToSlots.get(data.duration);

      if (swapSide === "buy") {
        // For buy side, use depositTokenB (paying USDC, getting SOL)
        await depositTokenB.mutateAsync({
          amount:
            data.amount * 10 ** (getTokenBalance.data?.value?.decimals || 6),
          duration: slotDuration || 30,
        });
      } else {
        // For sell side, use depositTokenA (paying SOL, getting USDC)
        await depositTokenA.mutateAsync({
          amount: data.amount * LAMPORTS_PER_SOL,
          duration: slotDuration || 30,
        });
      }
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const resetForm = () => {
    activeForm.reset({
      amount: 0,
      duration: activeForm.getValues().duration,
    });
    setInputError(false);
    setOutputError(false);
    setErrorMessage("");
  };

  const toggleChart = () => {
    setIsChartVisible(!isChartVisible);
    setChartIsVisible(!isChartVisible);
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
          error={inputError}
          onClick={() => {
            activeForm.setValue(
              "amount",
              Number((getBalance.data / LAMPORTS_PER_SOL / 4).toFixed(9))
            );
          }}
        />
        <PercentageButton
          error={inputError}
          percent="50%"
          onClick={() => {
            activeForm.setValue(
              "amount",
              Number((getBalance.data / LAMPORTS_PER_SOL / 2).toFixed(9))
            );
          }}
        />
        <PercentageButton
          error={inputError}
          percent="Max"
          onClick={() => {
            activeForm.setValue(
              "amount",
              Number((getBalance.data / LAMPORTS_PER_SOL - 0.003).toFixed(9))
            );
          }}
        />
      </div>
    );

  // Percentage buttons for USDC token
  const renderUsdcPercentageButtons = () =>
    getTokenBalance.data !== undefined && (
      <div className="flex gap-1 items-center">
        <PercentageButton
          percent="25%"
          error={inputError}
          onClick={() => {
            activeForm.setValue(
              "amount",
              Number((getTokenBalance.data?.value?.uiAmount! / 4).toFixed(2))
            );
          }}
        />
        <PercentageButton
          error={inputError}
          percent="50%"
          onClick={() => {
            activeForm.setValue(
              "amount",
              Number((getTokenBalance.data?.value?.uiAmount! / 2).toFixed(2))
            );
          }}
        />
        <PercentageButton
          error={inputError}
          percent="Max"
          onClick={() => {
            activeForm.setValue(
              "amount",
              Number((getTokenBalance.data?.value?.uiAmount ?? 0).toFixed(2))
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
        <BuySellSwitch side={swapSide} setSide={setSwapSide} />

        <LayoutGroup>
          <AnimatePresence mode="wait">
            {swapSide === "buy" ? (
              <motion.div
                key="buy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <Form {...buyForm}>
                  <form
                    onSubmit={buyForm.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="relative">
                      {/* Buy Side - USDC Input */}
                      <TokenInputBlock
                        title="Pay"
                        balance={
                          <AccountTokenBalance
                            address={provider.publicKey}
                            mintAddress={USDC_MINT}
                            decimals={4}
                            classname="text-sm"
                          />
                        }
                        amount={amount}
                        usdValue={`$${amount.toFixed(2)}`}
                        token={usdcToken}
                        isInput={true}
                        percentageButtons={renderUsdcPercentageButtons()}
                        form={buyForm}
                        fieldName="amount"
                        error={inputError}
                        errorMessage={errorMessage}
                      />

                      <SwitchArrow error={inputError} />

                      {/* Buy Side - SOL Output */}
                      <TokenInputBlock
                        title="Receive"
                        balance={
                          <AccountBalance
                            address={provider.publicKey}
                            classname="text-sm"
                          />
                        }
                        amount={(amount / 98).toFixed(9)} // Mock conversion calculation
                        usdValue={`$${amount.toFixed(2)}`}
                        token={solToken}
                        isInput={false}
                        error={outputError}
                        errorMessage={
                          outputError ? "Insufficient liquidity" : ""
                        }
                      />
                    </div>

                    {/* Duration and Price Impact Section */}
                    <div className="bg-[#0A352B] rounded-lg p-3">
                      <DurationSelector form={buyForm} />
                      <PriceImpactDisplay
                        price="0.01020 SOL"
                        percentage="+3.98%"
                      />
                      <ProtectionStatus />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="button"
                      disabled={inputError || outputError || isSubmitting}
                      onClick={executeTransaction}
                      className={cn(
                        "w-full py-3 font-bold text-base",
                        provider.publicKey
                          ? inputError || outputError || isSubmitting
                            ? "bg-red-500/50 text-white cursor-not-allowed"
                            : "bg-[#1CF6C2] text-[#091F1A] hover:brightness-110"
                          : "bg-[#1CF6C2] text-[#091F1A] hover:brightness-110"
                      )}
                    >
                      {provider.publicKey
                        ? inputError || outputError
                          ? "Error"
                          : isSubmitting
                            ? "Submitting..."
                            : "Buy"
                        : "Connect Wallet"}
                    </Button>
                  </form>
                </Form>
              </motion.div>
            ) : (
              <motion.div
                key="sell"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <Form {...sellForm}>
                  <form
                    onSubmit={sellForm.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="relative">
                      {/* Sell Side - SOL Input */}
                      <TokenInputBlock
                        title="Pay"
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
                        form={sellForm}
                        fieldName="amount"
                        error={inputError}
                        errorMessage={errorMessage}
                      />

                      <SwitchArrow error={inputError} />

                      {/* Sell Side - USDC Output */}
                      <TokenInputBlock
                        title="Receive"
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
                        error={outputError}
                        errorMessage={
                          outputError ? "Insufficient liquidity" : ""
                        }
                      />
                    </div>

                    {/* Duration and Price Impact Section */}
                    <div className="bg-[#0A352B] rounded-lg p-3">
                      <DurationSelector form={sellForm} />
                      <PriceImpactDisplay
                        price="146.06 USDC"
                        percentage="-2.45%"
                      />
                      <ProtectionStatus />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="button"
                      disabled={inputError || outputError || isSubmitting}
                      onClick={executeTransaction}
                      className={cn(
                        "w-full py-3 font-bold text-base",
                        provider.publicKey
                          ? inputError || outputError || isSubmitting
                            ? "bg-red-500/50 text-white cursor-not-allowed"
                            : "bg-[#1CF6C2] text-[#091F1A] hover:brightness-110"
                          : "bg-[#1CF6C2] text-[#091F1A] hover:brightness-110"
                      )}
                    >
                      {provider.publicKey
                        ? inputError || outputError
                          ? "Error"
                          : isSubmitting
                            ? "Submitting..."
                            : "Sell"
                        : "Connect Wallet"}
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </div>
  );
}
