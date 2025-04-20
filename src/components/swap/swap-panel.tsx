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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader } from "../ui/card";

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
import { Wallet } from "lucide-react";
import { PriceImpact } from "./price-impact";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const SwapFormSchema = z.object({
  amount: z.number().gt(0, "Must be greater than zero"),
  duration: z.string({
    required_error: "Please set a duration",
  }),
});

export function SwapPanel() {
  const { depositTokenA, depositTokenB } = useMatoProgram();

  const [side, setSide] = useState<"buy" | "sell">("buy");
  // const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const provider = useAnchorProvider();

  const getBalance = useGetBalance({ address: provider.publicKey });
  const getTokenBalance = useGetTokenBalance({
    address: provider.publicKey,
    mintAddress: USDC_MINT,
  });

  const form = useForm<z.infer<typeof SwapFormSchema>>({
    resolver: zodResolver(SwapFormSchema),
  });

  const amount = useWatch({
    control: form.control,
    defaultValue: 0,
    name: "amount", // specify the field name you want to watch
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

  return (
    <Card className="w-full lg:min-w-96 lg:w-fit h-fit">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <BuySellSwitch side={side} setSide={setSide} />
          {/* <div className="flex justify-between gap-2">
            <div className="flex border rounded-sm">
              <Button
                variant={"outline"}
                onClick={() => setOrderType("market")}
                className={cn(
                  orderType == "market" &&
                    "text-purple-500 hover:text-purple-500",
                  "flex-1 border-none hover:bg-transparent"
                )}
              >
                Market
              </Button>
              <Button
                variant={"outline"}
                onClick={() => setOrderType("limit")}
                className={cn(
                  orderType == "limit" &&
                    " text-purple-500 hover:text-purple-500",
                  "flex-1 border-none hover:bg-transparent"
                )}
              >
                Limit
              </Button>
            </div>
            <Input />
          </div> */}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col space-y-1.5 border rounded-md py-4 px-2 bg-purple-50/70">
                    {/* <FormLabel>
                      Quantity {side == "buy" ? "(USDC)" : "(SOL)"}
                    </FormLabel> */}
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 items-center text-sm font-semibold">
                        <Wallet size={16} />
                        {side == "sell" ? (
                          <div className="flex gap-1 items-center text-xs">
                            <AccountBalance
                              address={provider.publicKey}
                              classname="text-xs font-semibold"
                            />
                            SOL
                          </div>
                        ) : (
                          <div className="flex gap-1 items-center text-xs">
                            <AccountTokenBalance
                              address={provider.publicKey}
                              mintAddress={USDC_MINT}
                              decimals={4}
                              classname="text-xs font-semibold"
                            />{" "}
                            USDC{" "}
                          </div>
                        )}
                      </div>

                      {getBalance.data !== undefined &&
                        getTokenBalance.data !== undefined &&
                        getTokenBalance.data !== null && (
                          <div className="flex gap-1">
                            <div
                              className="text-xs font-bold rounded-md border p-1 hover:cursor-pointer hover:bg-slate-100"
                              onClick={() => {
                                side == "buy"
                                  ? form.setValue(
                                      "amount",
                                      Number(
                                        (
                                          parseInt(
                                            getTokenBalance.data?.value
                                              .amount || "0"
                                          ) /
                                          10 **
                                            (getTokenBalance.data?.value
                                              .decimals || 0) /
                                          4
                                        ).toFixed(6)
                                      )
                                    )
                                  : form.setValue(
                                      "amount",
                                      Number(
                                        (
                                          getBalance.data /
                                          LAMPORTS_PER_SOL /
                                          4
                                        ).toFixed(9)
                                      )
                                    );
                              }}
                            >
                              25%
                            </div>
                            <div
                              className="text-xs font-bold rounded-md border p-1 hover:cursor-pointer hover:bg-slate-100"
                              onClick={() => {
                                side == "buy"
                                  ? form.setValue(
                                      "amount",
                                      Number(
                                        (
                                          parseInt(
                                            getTokenBalance.data?.value
                                              .amount || "0"
                                          ) /
                                          10 **
                                            (getTokenBalance.data?.value
                                              .decimals || 0) /
                                          2
                                        ).toFixed(6)
                                      )
                                    )
                                  : form.setValue(
                                      "amount",
                                      Number(
                                        (
                                          getBalance.data /
                                          LAMPORTS_PER_SOL /
                                          2
                                        ).toFixed(9)
                                      )
                                    );
                              }}
                            >
                              50%
                            </div>
                            <div
                              className="text-xs font-bold rounded-md border p-1 hover:cursor-pointer hover:bg-slate-100"
                              onClick={() => {
                                side == "buy"
                                  ? form.setValue(
                                      "amount",
                                      Number(
                                        (
                                          parseInt(
                                            getTokenBalance.data?.value
                                              .amount || "0"
                                          ) /
                                          10 **
                                            (getTokenBalance.data?.value
                                              .decimals || 0)
                                        ).toFixed(6)
                                      )
                                    )
                                  : form.setValue(
                                      "amount",
                                      Number(
                                        (
                                          getBalance.data / LAMPORTS_PER_SOL -
                                          0.003
                                        ).toFixed(9)
                                      )
                                    );
                              }}
                            >
                              Max
                            </div>
                          </div>
                        )}
                    </div>
                    <div className="flex justify-between gap-4 items-end">
                      <div className="flex flex-col">
                        <div className="text-sm font-bold text-gray-500 mb-2">
                          {side == "buy" ? "You're paying" : "You're selling"}
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            {side == "buy" ? (
                              <div className="flex gap-2 items-center">
                                <Avatar className="w-6 h-6 sm:w-8 sm:h-8 bg-black">
                                  <AvatarImage src={"usd-coin-usdc-logo.png"} />
                                  <AvatarFallback>{"USDC"}</AvatarFallback>
                                </Avatar>{" "}
                                USDC
                              </div>
                            ) : (
                              <div className="flex gap-2 items-center">
                                <Avatar className="w-6 h-6 sm:w-8 sm:h-8 bg-black">
                                  <AvatarImage src={"solana-sol-logo.png"} />
                                  <AvatarFallback>{"SOL"}</AvatarFallback>
                                </Avatar>{" "}
                                SOL
                              </div>
                            )}
                          </div>
                          <Input
                            className="sm:w-fit h-full text-lg text-gray-600 text-right border-none focus:none shadow-none focus:ring-0 focus-visible:ring-0"
                            id="amount"
                            placeholder="0,0"
                            type="number"
                            inputMode="decimal"
                            step="any"
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                isNaN(e.target.valueAsNumber)
                                  ? 0
                                  : e.target.valueAsNumber
                              )
                            }
                            // onVolumeChange={field.onChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>

                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="5sec">5 sec</SelectItem>
                      <SelectItem value="1min">1 min</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="1day">1 day</SelectItem>
                      <SelectItem value="1week">1 week</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Your order is evenly distributed over this period of time
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />
            <PriceImpact
              flow={
                isNaN(amount)
                  ? 0
                  : side == "sell"
                    ? (amount * LAMPORTS_PER_SOL) /
                      (durationStringToSlots.get(form.watch("duration")) || 5)
                    : (amount * 1000000) /
                      (durationStringToSlots.get(form.watch("duration")) || 5)
              }
              side={side}
            />
            <Button
              type="submit"
              className="px-16 bg-gradient-to-br from-red-500 to-purple-500 hover:brightness-110"
            >
              {side == "buy" ? "Buy SOL" : "Sell SOL"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
