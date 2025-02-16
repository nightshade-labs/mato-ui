"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

import { AccountBalance, AccountTokenBalance } from "../account/account-ui";
import { USDC_MINT, VOLUME_PRECISION } from "@/lib/constants";
import {
  useGetBalance,
  useGetTokenBalance,
} from "../account/account-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { durationStringToSlots } from "@/lib/utils";
import { useMatoProgram } from "../mato/mato-data-access";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import BN from "bn.js";
import {
  ColorType,
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  UTCTimestamp,
} from "lightweight-charts";
import { MarketDataRow } from "./market-data";

const SwapFormSchema = z.object({
  amount: z.number().gt(0, "Must be greater than zero"),
  // duration: z.string({
  //   required_error: "Please set a duration",
  // }),
});

export function SwapInterface() {
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
    // let slotDuration = durationStringToSlots.get(data.duration);
    if (side == "sell") {
      depositTokenA.mutate({
        amount: data.amount * LAMPORTS_PER_SOL,
        duration: 30,
      });
    } else {
      depositTokenB.mutate({
        amount: data.amount * 10 ** (getTokenBalance.data?.value.decimals || 6),
        duration: 30,
      });
    }
  }

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
            {/* <FormField
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
            /> */}
            <Button type="submit">
              {side == "buy" ? "Buy SOL" : "Sell SOL"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function PriceChart({ data }: { data: Array<LineData<UTCTimestamp>> }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    chart?: IChartApi;
    lineSeries?: ISeriesApi<"Line">;
  }>({});

  const [time, setTime] = useState(Date.now() / 1000);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now() / 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current.chart) {
        chartRef.current.chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "white" },
        textColor: "black",
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      autoSize: true,
      timeScale: {
        minBarSpacing: 0.05,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
          });
        },
      },
    });
    chart.timeScale().fitContent();

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#E130E6",
      lineWidth: 2,
    });
    lineSeries.setData(data);

    window.addEventListener("resize", handleResize);

    chartRef.current.chart = chart;
    chartRef.current.lineSeries = lineSeries;
    return () => {
      window.removeEventListener("resize", handleResize);

      chart.remove();
      chartRef.current = {};
    };
  }, [data]);

  const { getMarketAccount } = useMatoProgram();

  let tradingVolumeA =
    getMarketAccount.data?.tokenAVolume
      .div(new BN(VOLUME_PRECISION))
      .toNumber() || 0;
  let tradingVolumeB =
    getMarketAccount.data?.tokenBVolume
      .div(new BN(VOLUME_PRECISION))
      .toNumber() || 0;

  let isTrading = tradingVolumeA * tradingVolumeB !== 0;
  useEffect(() => {
    if (isTrading && chartRef.current.lineSeries) {
      chartRef.current.lineSeries.update({
        time: time as UTCTimestamp,
        value: (tradingVolumeB * 1000) / tradingVolumeA,
      });
    }
  }, [isTrading, tradingVolumeA, tradingVolumeB, time]);

  let marketPrice = isTrading
    ? ((tradingVolumeB * LAMPORTS_PER_SOL) / 1000000 / tradingVolumeA).toFixed(
        2
      ) + " USDC"
    : "no trades right now";

  return (
    <Card className="w-full lg:w-1/2 sm:min-h-96">
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-xl items-center">
              <div className="flex gap-0">
                <Avatar className="w-6 h-6 sm:w-8 sm:h-8 bg-black">
                  <AvatarImage src={"solana-sol-logo.png"} />
                  <AvatarFallback>{"SOL"}</AvatarFallback>
                </Avatar>
                <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                  <AvatarImage src={"usd-coin-usdc-logo.png"} />
                  <AvatarFallback>{"USDC"}</AvatarFallback>
                </Avatar>
              </div>
              SOL / USDC
            </div>
            <span className="text-2xl">{marketPrice}</span>
          </div>
          {/* <div className="mt-4 text-sm">
            Flow (SOL per minute):{" "}
            {((tradingVolumeA * 2.5 * 60) / LAMPORTS_PER_SOL).toFixed(2)}
          </div>
          <div className="mt-0 text-sm">
            Flow (USDC per minute):{" "}
            {((tradingVolumeB * 2.5 * 60) / 1000000).toFixed(2)}
          </div> */}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex w-full justify-center">
        <div className="w-full h-full" ref={chartContainerRef} />
      </CardContent>
    </Card>
  );
}
