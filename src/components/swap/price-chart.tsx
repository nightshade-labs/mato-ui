"use client";

import {
  ColorType,
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  LineStyle,
  UTCTimestamp,
} from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useEffect, useRef, useState } from "react";
import { VOLUME_PRECISION } from "@/lib/constants";
import BN from "bn.js";
import { useMatoProgram } from "../mato/mato-data-access";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

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
      // rightPriceScale: {
      //   autoScale: false, // disables auto scaling based on visible content
      //   scaleMargins: {
      //     top: 0.1,
      //     bottom: 0.2,
      //   },
      // },
      crosshair: {
        // Change mode from default 'magnet' to 'normal'.
        // Allows the crosshair to move freely without snapping to datapoints
        mode: CrosshairMode.Normal,

        // Vertical crosshair line (showing Date in Label)
        vertLine: {
          width: 4,
          color: "#C3BCDB77",
          style: LineStyle.Solid,
          labelBackgroundColor: "#f7a2c4",
        },

        // Horizontal crosshair line (showing Price in Label)
        horzLine: {
          color: "#f7a2c4",
          labelBackgroundColor: "#f7a2c4",
        },
      },
      timeScale: {
        minBarSpacing: 0.01,
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
      color: "#a855f7bb",
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
