"use client";
import { Logo } from "@/components/logo";
import { TrendingUp, Shield, Sparkles, Timer, BarChart } from "lucide-react";
import DottedMap from "dotted-map";
import { Area, AreaChart, CartesianGrid } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import Image from "next/image";

export default function FeaturesSection() {
  return (
    <section className="px-4 py-16 md:py-32">
      <div className="mx-auto grid max-w-5xl border md:grid-cols-2">
        <div>
          <div className="p-6 sm:p-12">
            <span className="text-muted-foreground flex items-center gap-2">
              <TrendingUp className="size-4 " />
              Better Trading Prices
            </span>

            <p className="mt-8 text-2xl  font-clash font-medium">
              Get better prices with gradual trade execution that minimizes
              market impact.
            </p>
          </div>

          <div aria-hidden className="relative">
            <div className="absolute inset-0 z-10 m-auto size-fit">
              {/* <div className="rounded-(--radius) bg-background z-1 dark:bg-muted relative flex size-fit w-fit items-center gap-2 border px-3 py-1 text-xs font-medium shadow-md shadow-zinc-950/5">
                <span className="text-lg">🇨🇩</span> Last connection from DR
                Congo
              </div> */}
            </div>

            <div className="relative overflow-hidden">
              <div className="bg-radial z-1 to-background absolute inset-0 from-transparent to-75%"></div>
              {/* <Map /> */}
              {/* <video src="/gif.mp4" autoPlay loop muted /> */}
              <Image
                src="/a1.jpeg"
                width={300}
                className="mx-auto pb-8 hover:scale-105 duration-300"
                height={400}
                alt="gif"
              />
            </div>
          </div>
        </div>
        <div className="overflow-hidden border-t bg-zinc-50 p-6 sm:p-12 md:border-0 md:border-l dark:bg-transparent">
          <div className="relative z-10">
            <span className="text-muted-foreground  flex items-center gap-2">
              <Shield className="size-4" />
              Always-On Bot Protection
            </span>

            <p className="my-8 text-2xl font-clash font-medium">
              Trade with confidence knowing your orders are protected from
              front-running and sandwich attacks.
            </p>
          </div>
          <div aria-hidden className="flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-5 rounded-full border">
                  {/* <Logo className="m-auto size-3" /> */}
                </span>
                <span className="text-muted-foreground text-xs">
                  Sat 22 Feb
                </span>
              </div>
              <div className="rounded-(--radius) bg-background mt-1.5 w-3/5 border p-3 text-xs">
                Hey, I'm having trouble with my account.
              </div>
            </div>

            <div>
              <div className="rounded-(--radius) mb-1 ml-auto w-3/5 bg-green-800 p-3 text-xs text-white">
                Molestiae numquam debitis et ullam distinctio provident nobis
                repudiandae deleniti necessitatibus.
              </div>
              <span className="text-muted-foreground block text-right text-xs">
                Now
              </span>
            </div>
          </div>
        </div>
        <div className="col-span-full border-y p-12">
          <p className="text-center font-clash text-4xl font-semibold lg:text-7xl">
            Ultra-Low Fees on Solana
          </p>
        </div>
        <div className="relative hidden sm:block col-span-full">
          <div className="absolute z-10 max-w-lg px-6 pr-12 pt-6 md:px-12 md:pt-12">
            <span className="text-muted-foreground flex items-center gap-2">
              <BarChart className="size-4" />
              Trade Analytics
            </span>

            <p className="my-8 text-2xl font-clash font-medium">
              See your savings in real-time.{" "}
              <span className="text-muted-foreground">
                Track how gradual execution improves your trading results.
              </span>
            </p>
          </div>
          <MonitoringChart />
        </div>
      </div>
    </section>
  );
}

const map = new DottedMap({ height: 55, grid: "diagonal" });

const points = map.getPoints();

const svgOptions = {
  backgroundColor: "var(--color-background)",
  color: "currentColor",
  radius: 0.15,
};

const Map = () => {
  const viewBox = `0 0 120 60`;
  return (
    <svg viewBox={viewBox} style={{ background: svgOptions.backgroundColor }}>
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={svgOptions.radius}
          fill={svgOptions.color}
        />
      ))}
    </svg>
  );
};

const chartConfig = {
  desktop: {
    label: "Market",
    color: "#1CF6C2",
  },
  mobile: {
    label: "Mato",
    color: "#03B27A",
  },
} satisfies ChartConfig;

const chartData = [
  { month: "May", desktop: 56, mobile: 224 },
  { month: "June", desktop: 56, mobile: 224 },
  { month: "January", desktop: 126, mobile: 252 },
  { month: "February", desktop: 205, mobile: 410 },
  { month: "March", desktop: 200, mobile: 126 },
  { month: "April", desktop: 400, mobile: 800 },
];

const MonitoringChart = () => {
  return (
    <ChartContainer className="h-120 aspect-auto md:h-96" config={chartConfig}>
      <AreaChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: 0,
          right: 0,
        }}
      >
        <defs>
          <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-desktop)"
              stopOpacity={0.8}
            />
            <stop
              offset="55%"
              stopColor="var(--color-desktop)"
              stopOpacity={0.1}
            />
          </linearGradient>
          <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-mobile)"
              stopOpacity={0.8}
            />
            <stop
              offset="55%"
              stopColor="var(--color-mobile)"
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <ChartTooltip
          active
          cursor={false}
          content={<ChartTooltipContent className="dark:bg-muted" />}
        />
        <Area
          strokeWidth={2}
          dataKey="mobile"
          type="stepBefore"
          fill="url(#fillMobile)"
          fillOpacity={0.1}
          stroke="var(--color-mobile)"
          stackId="a"
        />
        <Area
          strokeWidth={2}
          dataKey="desktop"
          type="stepBefore"
          fill="url(#fillDesktop)"
          fillOpacity={0.1}
          stroke="var(--color-desktop)"
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  );
};
