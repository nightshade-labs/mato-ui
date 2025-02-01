"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useMatoProgram } from "./mato-data-access";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useConnection } from "@solana/wallet-adapter-react";

import { AccountBalance, AccountTokenBalance } from "../account/account-ui";
import { USDC_MINT } from "@/lib/constants";
import {
  useGetBalance,
  useGetTokenBalance,
} from "../account/account-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { durationStringToSlots } from "@/lib/utils";

const SwapFormSchema = z.object({
  amount: z.number().gt(0, "Must be greater than zero"),
  duration: z.string({
    required_error: "Please set a duration",
  }),
});

export function SwapInterface({}: {}) {
  const { depositTokenA, depositTokenB } = useMatoProgram();

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const provider = useAnchorProvider();

  const getBalance = useGetBalance({ address: provider.publicKey });
  const getTokenBalance = useGetTokenBalance({
    address: provider.publicKey,
    mintAddress: USDC_MINT,
  });

  const form = useForm<z.infer<typeof SwapFormSchema>>({
    resolver: zodResolver(SwapFormSchema),
  });

  async function onSubmit(data: z.infer<typeof SwapFormSchema>) {
    let slotDuration = durationStringToSlots.get(data.duration);
    if (side == "sell") {
      depositTokenA.mutate({
        amount: data.amount * LAMPORTS_PER_SOL,
        duration: slotDuration || 10,
      });
    } else {
      depositTokenB.mutate({
        amount: data.amount * (getTokenBalance.data?.value.decimals || 100000),
        duration: slotDuration || 10,
      });
    }
  }

  // let tresurayA = await connection.getTokenAccountBalance(
  //   getMarket.data?.treasuryA || PublicKey.default
  // );
  // let treasuryB = await connection.getTokenAccountBalance(
  //   getMarket.data?.treasuryB || PublicKey.default
  // );

  // console.log("tokenvolume a", getMarket.data?.tokenAVolume.toString());
  // console.log("tokenvolume b", getMarket.data?.tokenBVolume.toString());
  // console.log("treasury A", tresurayA);
  // console.log("treasury B", treasuryB);

  return (
    <Card className="w-full lg:min-w-96 lg:w-fit h-fit">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between">
            <Button
              variant={side === "buy" ? "default" : "outline"}
              onClick={() => setSide("buy")}
              className="flex-1 rounded-l-xl rounded-r-none bg-opacity-20"
            >
              Buy
            </Button>
            <Button
              variant={side === "sell" ? "default" : "outline"}
              onClick={() => setSide("sell")}
              className="flex-1 rounded-r-xl rounded-l-none bg-opacity-20"
            >
              Sell
            </Button>
          </div>
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
                  <div className="flex flex-col space-y-1.5">
                    <FormLabel>
                      Quantity {side == "buy" ? "(USDC)" : "(SOL)"}
                    </FormLabel>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 text-xs font-semibold">
                        Balance:{" "}
                        {side == "sell" ? (
                          <AccountBalance
                            address={provider.publicKey}
                            classname="text-xs font-semibold"
                          />
                        ) : (
                          <AccountTokenBalance
                            address={provider.publicKey}
                            mintAddress={USDC_MINT}
                            decimals={4}
                            classname="text-xs font-semibold"
                          />
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
                                      getBalance.data / LAMPORTS_PER_SOL - 0.003
                                    );
                              }}
                            >
                              Max
                            </div>
                          </div>
                        )}
                    </div>
                    <Input
                      id="amount"
                      placeholder="0,0"
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      onVolumeChange={field.onChange}
                    />
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
            <Button type="submit">
              {side == "buy" ? "Buy SOL" : "Sell SOL"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
