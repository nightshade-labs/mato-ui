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
import { useEffect, useRef, useState } from "react";
import { VOLUME_PRECISION } from "@/lib/constants";
import BN from "bn.js";
import { useMatoProgram } from "../mato/mato-data-access";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export interface PriceChartProps {
  data: Array<LineData<UTCTimestamp>>;
  onTimeRangeChange?: () => void;
}

export function PriceChart({ data, onTimeRangeChange }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    chart?: IChartApi;
    lineSeries?: ISeriesApi<"Line">;
  }>({});
  const loadingRef = useRef(false);
  const lastTimeRef = useRef<number>(0);

  const [time, setTime] = useState<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Effect to update the chart data
  useEffect(() => {
    if (chartRef.current.lineSeries) {
      chartRef.current.lineSeries.setData(data);

      if (data.length > 0) {
        const lastDataPoint = data[data.length - 1];
        if (typeof lastDataPoint.time === "number") {
          lastTimeRef.current = lastDataPoint.time;
        }
      }
    }
  }, [data]);

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
        background: { type: ColorType.Solid, color: "#0A352B" },
        textColor: "#9DA5A3",
        fontSize: 12,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      autoSize: true,
      grid: {
        vertLines: {
          color: "#0F3C32",
          style: LineStyle.Dotted,
        },
        horzLines: {
          color: "#0F3C32",
          style: LineStyle.Dotted,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 2,
          color: "rgba(28, 246, 194, 0.4)",
          style: LineStyle.Solid,
          labelBackgroundColor: "#1CF6C2",
        },
        horzLine: {
          color: "rgba(28, 246, 194, 0.4)",
          labelBackgroundColor: "#1CF6C2",
        },
      },
      timeScale: {
        minBarSpacing: 0.01,
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#0F3C32",
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
          });
        },
      },
      rightPriceScale: {
        borderColor: "#0F3C32",
      },
    });

    if (onTimeRangeChange) {
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (!range || loadingRef.current) return;

        const logicalFrom = range.from;
        if (logicalFrom < 10) {
          loadingRef.current = true;
          Promise.resolve(onTimeRangeChange()).finally(() => {
            loadingRef.current = false;
          });
        }
      });
    }

    chart.timeScale().fitContent();

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#1CF6C2",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
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
  }, [onTimeRangeChange]);

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
      const currentTime = Math.floor(time);

      if (currentTime > lastTimeRef.current) {
        lastTimeRef.current = currentTime;

        chartRef.current.lineSeries.update({
          time: currentTime as UTCTimestamp,
          value: (tradingVolumeB * 1000) / tradingVolumeA,
        });
      }
    }
  }, [isTrading, tradingVolumeA, tradingVolumeB, time]);

  let marketPrice = isTrading
    ? ((tradingVolumeB * LAMPORTS_PER_SOL) / 1000000 / tradingVolumeA).toFixed(
        2
      ) + " USDC"
    : "no trades right now";

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between items-center mb-4 px-2">
        <span className="text-2xl text-[#E9F6F3] font-medium">
          {marketPrice}
        </span>
      </div>
      <div className="w-full h-80" ref={chartContainerRef} />
    </div>
  );
}
