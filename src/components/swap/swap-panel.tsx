"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { AnimatePresence, motion, LayoutGroup } from "motion/react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHardError, setIsHardError] = useState(false);
  const [isSoftError, setIsSoftError] = useState(false);
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

  // Token data definitions
  const solToken: TokenData = {
    symbol: "SOL",
    image: "/solana-sol-logo.png",
  };

  const usdcToken: TokenData = {
    symbol: "USDC",
    image: "/usd-coin-usdc-logo.png",
  };

  const [fromToken, setFromToken] = useState<TokenData>(usdcToken);
  const [toToken, setToToken] = useState<TokenData>(solToken);
  const [fromAmountString, setFromAmountString] = useState("0");
  const [toAmountString, setToAmountString] = useState("0");

  // This useEffect updates string amounts for display and calculates toAmount
  useEffect(() => {
    setFromAmountString(amount.toString());
    // Mock calculation for toAmountString, replace with actual logic
    if (fromToken.symbol === "USDC" && toToken.symbol === "SOL") {
      setToAmountString((amount / 98).toFixed(5)); // Example: 1 USDC = 1/98 SOL
    } else if (fromToken.symbol === "SOL" && toToken.symbol === "USDC") {
      setToAmountString((amount * 98).toFixed(2)); // Example: 1 SOL = 98 USDC
    } else {
      setToAmountString("0"); // Handle other pairs or reset
    }
  }, [amount, fromToken, toToken]);

  // Validate amount against balance and check liquidity
  useEffect(() => {
    let currentInputError = false;
    let currentOutputError = false;
    let currentErrorMessage = "";
    let hardErrorActive = false;
    let softErrorActive = false;

    // Reset errors at the beginning of validation
    setIsHardError(false);
    setIsSoftError(false);

    if (fromToken.symbol === "USDC") {
      if (amount < 0) {
        currentInputError = true;
        hardErrorActive = true;
        currentErrorMessage = "Amount must be greater than zero";
      } else if (getTokenBalance.data) {
        const maxAmount = getTokenBalance.data?.value?.uiAmount || 0;
        if (amount > maxAmount) {
          currentInputError = true;
          softErrorActive = true;
          currentErrorMessage = "Insufficient USDC balance";
        }
      } else if (getTokenBalance.isLoading) {
        // Optionally handle loading state, e.g., disable input or show loader
      }
    } else if (fromToken.symbol === "SOL") {
      if (amount < 0) {
        currentInputError = true;
        hardErrorActive = true;
        currentErrorMessage = "Amount must be greater than zero";
      } else if (getBalance.data) {
        const maxAmount = getBalance.data / LAMPORTS_PER_SOL - 0.003; // Buffer for fees
        if (amount > maxAmount) {
          currentInputError = true;
          softErrorActive = true;
          currentErrorMessage = "Insufficient SOL balance";
        }
      } else if (getBalance.isLoading) {
        // Optionally handle loading state
      }
    }

    setIsHardError(hardErrorActive);
    setIsSoftError(softErrorActive);
    setInputError(currentInputError);

    // Output validation logic for liquidity checks
    // This part needs to be updated based on the actual from/to tokens and their liquidity
    let currentOutputErrorState = false; // store output error state separately
    if (!currentInputError) {
      // Only check output error if no input error
      if (fromToken.symbol === "USDC" && toToken.symbol === "SOL") {
        if (amount / 98 > 10000) {
          // Mock liquidity for SOL
          currentOutputErrorState = true;
          currentErrorMessage = "Not enough SOL liquidity for this amount.";
        }
      } else if (fromToken.symbol === "SOL" && toToken.symbol === "USDC") {
        if (amount * 98 > 1000000) {
          // Mock liquidity for USDC
          currentOutputErrorState = true;
          currentErrorMessage = "Not enough USDC liquidity for this amount.";
        }
      }
    }
    setOutputError(currentOutputErrorState); // Set output error state

    // Set errorMessage based on priority: input error > output error
    if (currentInputError) {
      setErrorMessage(currentErrorMessage);
    } else if (currentOutputErrorState) {
      setErrorMessage(currentErrorMessage); // This was already set by output logic
    } else {
      setErrorMessage(""); // Clear message if no errors
    }
  }, [
    amount,
    getBalance.data,
    getBalance.isLoading,
    getTokenBalance.data,
    getTokenBalance.isLoading,
    fromToken,
    toToken,
    LAMPORTS_PER_SOL,
    form.formState.isSubmitted, // Keep for potential future use if submit interaction affects errors
  ]);

  function onSubmit(data: z.infer<typeof SwapFormSchema>) {
    if (inputError || outputError) {
      return;
    }
  }

  async function executeTransaction() {
    if (inputError || outputError || !provider.publicKey) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = form.getValues();
      let slotDuration = durationStringToSlots.get(data.duration);

      if (getTokenBalance.data) {
        await depositTokenB.mutateAsync({
          amount:
            data.amount * 10 ** (getTokenBalance.data.value.decimals || 6),
          duration: slotDuration || 30,
        });
      } else if (getBalance.data) {
        await depositTokenA.mutateAsync({
          amount: data.amount * LAMPORTS_PER_SOL,
          duration: slotDuration || 30,
        });
      } else {
        console.error("Unsupported token pair for transaction");
        setErrorMessage("Unsupported token pair for transaction.");
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const resetForm = () => {
    form.reset({
      amount: 0,
      duration: form.getValues().duration,
    });
    setInputError(false);
    setOutputError(false);
    setErrorMessage("");
    setIsHardError(false);
    setIsSoftError(false);
    setIsChartVisible(!isChartVisible);
  };

  const toggleChart = () => {
    setIsChartVisible(!isChartVisible);
    setChartIsVisible(!isChartVisible);
  };

  const estimatedFromUsd =
    fromToken.symbol === "USDC"
      ? parseFloat(fromAmountString)
      : parseFloat(fromAmountString) * 98; // Mock calculation
  const estimatedToUsd =
    toToken.symbol === "USDC"
      ? parseFloat(toAmountString)
      : parseFloat(toAmountString) * 98; // Mock calculation

  const handleTokenSwitch = () => {
    const currentFromToken = fromToken;
    const currentToToken = toToken;
    const currentFromAmount = form.getValues("amount");

    setFromToken(currentToToken);
    setToToken(currentFromToken);

    let newFromAmount = 0;
    if (currentToToken.symbol === "USDC") {
      newFromAmount = parseFloat(toAmountString) || 0;
    } else if (currentToToken.symbol === "SOL") {
      newFromAmount = parseFloat(toAmountString) || 0;
    }
    form.setValue(
      "amount",
      parseFloat(newFromAmount.toFixed(currentToToken.symbol === "SOL" ? 9 : 2))
    );

    setInputError(false);
    setOutputError(false);
    setErrorMessage("");
    setIsHardError(false);
    setIsSoftError(false);
  };

  const renderPercentageButtons = () => {
    if (fromToken.symbol === "SOL") {
      return (
        getBalance.data !== undefined && (
          <div className="flex gap-1 items-center">
            <PercentageButton
              percent="25%"
              error={inputError}
              isHardError={isHardError}
              isSoftError={isSoftError}
              onClick={() => {
                form.setValue(
                  "amount",
                  Number((getBalance.data / LAMPORTS_PER_SOL / 4).toFixed(9))
                );
              }}
            />
            <PercentageButton
              error={inputError}
              isHardError={isHardError}
              isSoftError={isSoftError}
              percent="50%"
              onClick={() => {
                form.setValue(
                  "amount",
                  Number((getBalance.data / LAMPORTS_PER_SOL / 2).toFixed(9))
                );
              }}
            />
            <PercentageButton
              error={inputError}
              isHardError={isHardError}
              isSoftError={isSoftError}
              percent="Max"
              onClick={() => {
                form.setValue(
                  "amount",
                  Number(
                    (getBalance.data / LAMPORTS_PER_SOL - 0.003).toFixed(9)
                  )
                );
              }}
            />
          </div>
        )
      );
    } else if (fromToken.symbol === "USDC") {
      return (
        getTokenBalance.data !== undefined && (
          <div className="flex gap-1 items-center">
            <PercentageButton
              percent="25%"
              error={inputError}
              isHardError={isHardError}
              isSoftError={isSoftError}
              onClick={() => {
                form.setValue(
                  "amount",
                  Number(
                    ((getTokenBalance.data?.value?.uiAmount || 0) / 4).toFixed(
                      getTokenBalance.data?.value?.decimals || 6
                    )
                  )
                );
              }}
            />
            <PercentageButton
              error={inputError}
              isHardError={isHardError}
              isSoftError={isSoftError}
              percent="50%"
              onClick={() => {
                form.setValue(
                  "amount",
                  Number(
                    ((getTokenBalance.data?.value?.uiAmount || 0) / 2).toFixed(
                      getTokenBalance.data?.value?.decimals || 6
                    )
                  )
                );
              }}
            />
            <PercentageButton
              error={inputError}
              isHardError={isHardError}
              isSoftError={isSoftError}
              percent="Max"
              onClick={() => {
                form.setValue(
                  "amount",
                  Number(
                    (getTokenBalance.data?.value?.uiAmount || 0).toFixed(
                      getTokenBalance.data?.value?.decimals || 6
                    )
                  )
                );
              }}
            />
          </div>
        )
      );
    }
    return null;
  };

  const currentBalance =
    fromToken.symbol === "SOL"
      ? getBalance.data
        ? (getBalance.data / LAMPORTS_PER_SOL).toFixed(4)
        : "0.00"
      : getTokenBalance.data?.value?.uiAmountString || "0.00";

  return (
    <div className="relative w-full lg:w-fit">
      <ControlButtons
        isChartVisible={isChartVisible}
        toggleChart={toggleChart}
        resetForm={resetForm}
      />

      <div className="w-full lg:min-w-96 bg-card p-2.5 rounded-lg">
        <Tabs defaultValue="swap" className="w-fit">
          <TabsList className="grid w-fit grid-cols-2 bg-transparent rounded-md">
            <TabsTrigger
              value="swap"
              className="data-[state=active]:bg-bg-2-60 data-[state=active]:text-white data-[state=inactive]:text-gray-400 rounded-md py-1.5 text-sm font-medium"
            >
              Swap
            </TabsTrigger>
            <TabsTrigger
              value="limit"
              disabled
              className="data-[state=active]:bg-[#102924] data-[state=active]:text-white data-[state=inactive]:text-gray-500 cursor-not-allowed rounded-md py-1.5 text-sm font-medium"
            >
              Limit
            </TabsTrigger>
          </TabsList>
          <TabsContent value="swap" className="  space-y-3">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-3"
              >
                <div className="flex flex-col relative gap-3">
                  <TokenInputBlock
                    title="From"
                    token={fromToken}
                    amount={fromAmountString}
                    isInput={true}
                    form={form}
                    fieldName="amount"
                    usdValue={`$${estimatedFromUsd.toFixed(2)}`}
                    balance={currentBalance}
                    percentageButtons={renderPercentageButtons()}
                    error={inputError}
                    isHardError={isHardError}
                    isSoftError={isSoftError}
                    errorMessage={inputError ? errorMessage : ""}
                  />

                  <motion.button
                    type="button"
                    onClick={handleTokenSwitch}
                    animate={{ top: inputError ? "53%" : "50%" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="focus:outline-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 mt-1"
                  >
                    <SwitchArrow error={inputError || outputError} />
                  </motion.button>

                  <TokenInputBlock
                    title="To"
                    token={toToken}
                    amount={toAmountString}
                    isInput={false}
                    usdValue={`$${estimatedToUsd.toFixed(2)}`}
                    balance={
                      toToken.symbol === "SOL"
                        ? getBalance.data
                          ? (getBalance.data / LAMPORTS_PER_SOL).toFixed(4)
                          : "0.00"
                        : getTokenBalance.data?.value?.uiAmountString || "0.00"
                    }
                    error={outputError}
                    errorMessage={outputError ? errorMessage : ""}
                  />
                  {errorMessage && !inputError && !outputError && (
                    <p className="text-xs text-red-400 text-center pt-1">
                      {errorMessage}
                    </p>
                  )}
                </div>
                <DurationSelector form={form} />

                <Button
                  type="button"
                  onClick={
                    provider.publicKey
                      ? executeTransaction
                      : () => console.log("Connect wallet clicked")
                  }
                  disabled={
                    inputError ||
                    outputError ||
                    !form.formState.isValid ||
                    isSubmitting ||
                    !provider.publicKey
                  }
                  className={cn(
                    "w-full py-3 font-bold text-base transition-all",
                    !provider.publicKey
                      ? "bg-[#1CF6C2] text-[#091F1A] hover:brightness-110"
                      : inputError || outputError
                        ? "bg-red-500/80 text-white cursor-not-allowed"
                        : isSubmitting
                          ? "bg-gray-500/80 text-white cursor-wait"
                          : "bg-[#1CF6C2] text-[#091F1A] hover:brightness-110 focus:ring-2 focus:ring-[#1CF6C2] focus:ring-offset-2 focus:ring-offset-[#102924]"
                  )}
                >
                  {!provider.publicKey
                    ? "Connect Wallet"
                    : isHardError
                      ? "Amount Required"
                      : isSoftError
                        ? "Insufficient Balance"
                        : outputError
                          ? errorMessage || "Error"
                          : isSubmitting
                            ? "Processing..."
                            : fromToken.symbol === "USDC" &&
                                toToken.symbol === "SOL"
                              ? "Buy SOL"
                              : fromToken.symbol === "SOL" &&
                                  toToken.symbol === "USDC"
                                ? "Sell SOL"
                                : "Swap"}
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="limit">
            <div className="text-center py-10 text-gray-500">
              Limit orders are coming soon!
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
