"use client";
import React from "react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { motion } from "motion/react";
import { textVariant } from "@/lib/anims";
import Link from "next/link";

interface TokenData {
  name: string;
  symbol: string;
  price: string;
  change: string;
  isPositive: boolean;
  iconColor: string;
  logo?: string;
}

const tokenData: TokenData[] = [
  {
    name: "Solana",
    symbol: "SOL",
    price: "$194.46",
    change: "+1.71%",
    isPositive: true,
    iconColor: "bg-purple-500",
    logo: "/solana-sol-logo.png",
  },
  {
    name: "USDC",
    symbol: "USDC",
    price: "$200.73",
    change: "+2.63%",
    isPositive: true,
    iconColor: "bg-pink-500",
    logo: "/usdc-icon.png",
  },
  {
    name: "Chainlink",
    symbol: "LINK",
    price: "$13.69",
    change: "+1.04%",
    isPositive: true,
    iconColor: "bg-blue-500",
    logo: "/chainlink.webp",
  },
  {
    name: "Jupiter",
    symbol: "JUP",
    price: "$19.13",
    change: "-1.61%",
    isPositive: false,
    iconColor: "bg-orange-500",
    logo: "/jupiter.webp",
  },
];

const TokenTicker = ({ token }: { token: TokenData }) => (
  <div className="flex cursor-crosshair hover:scale-105 transition-all duration-200 items-center gap-3 bg-[#109071] rounded-full px-4 py-2 whitespace-nowrap">
    {token.logo ? (
      <div className="w-12 h-12 rounded-full ">
        <Image
          src={token.logo}
          width={48}
          height={48}
          alt={`${token.name} logo`}
          className="w-12 h-12 rounded-full"
        />
      </div>
    ) : (
      <div className={`w-12 h-12 rounded-full ${token.iconColor}`} />
    )}
    <div className="flex flex-col">
      <span className="text-[#E9F6F3] font-medium text-lg">{token.name}</span>
      <div className="flex items-center gap-2">
        <span className="text-[#E9F6F3] text-sm">{token.price}</span>
        <span
          className={`text-xs ${
            token.isPositive ? "text-[#1CF6C2]" : "text-[#FF7A7A]"
          }`}
        >
          {token.change}
        </span>
      </div>
    </div>
  </div>
);

const TickerTapeRow = ({
  direction = "left",
  speed = "30s",
}: {
  direction?: "left" | "right";
  speed?: string;
}) => (
  <div className="">
    <div
      className={`flex gap-3 ${
        direction === "left" ? "animate-scroll-left" : "animate-scroll-right"
      }`}
      style={{ "--duration": speed } as React.CSSProperties}
    >
      {/* First set */}
      {tokenData.map((token, index) => (
        <TokenTicker key={`first-${index}`} token={token} />
      ))}
      {/* Duplicate for seamless loop */}
      {tokenData.map((token, index) => (
        <TokenTicker key={`second-${index}`} token={token} />
      ))}
      {/* Third set for extra smoothness */}
      {tokenData.map((token, index) => (
        <TokenTicker key={`third-${index}`} token={token} />
      ))}
    </div>
  </div>
);

const CTASection = () => {
  return (
    <motion.div
      initial="hidden"
      whileInView={"show"}
      variants={textVariant(0.5)}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="flex flex-col  items-stretch gap-12 px-4"
    >
      <div className="relative bg-[#101111] border border-[#202626] rounded-2xl p-3 shadow-[inset_0px_0px_50px_-16px_rgba(16,144,113,0.2)] overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Content Section */}
          <div className="flex flex-col justify-between gap-4 p-6 lg:w-1/2">
            <div className="flex flex-col gap-6">
              <h1 className="text-white  text-4xl lg:text-5xl font-medium leading-tight">
                Start Trading Without The Bots
              </h1>
              <p className="text-[#C5CECC] text-lg leading-relaxed max-w-lg">
                Trade securely on Solana with gradual execution—no front-running
                bots, no value leakage, just fair crypto trading.
              </p>
            </div>
            <div className="mt-4">
              <Link href={"/swap"}>
                <ShimmerButton
                  className="bg-[#1CF6C2] border-[#1CF6C2]/40 border-2 text-black font-semibold px-6 py-3 rounded-xl group-[hover]:shadow-[0px_0px_34px_-5px_rgba(28,246,194,0.35)]  shadow-[0px_0px_34px_-5px_rgba(28,246,194,0.35)] hover:bg-[#1CF6C2]/90 transition-all duration-300 hover:scale-105"
                  shimmerColor="#ffffff"
                  background="#1CF6C2"
                >
                  <span className="flex items-center gap-2">
                    Launch App
                    <ArrowUpRight className=" group-hover:rotate-45 duration-300 transition-all w-5 h-5" />
                  </span>
                </ShimmerButton>
              </Link>
            </div>
          </div>

          {/* Animation Section */}
          <div className="flex-1 relative overflow-hidden rounded-2xl">
            {/* Rotated Ticker Tapes */}
            <div className="absolute inset-0  flex flex-col  gap-4 -rotate-[32deg] scale-110">
              <TickerTapeRow direction="left" speed="25s" />
              <TickerTapeRow direction="right" speed="30s" />
              <TickerTapeRow direction="left" speed="35s" />
              <TickerTapeRow direction="right" speed="28s" />
            </div>
            {/* Left Fade Overlay */}
            <div className="absolute inset-y-0 left-0 w-2/3 shadow-[inset_0px_0px_50px_-16px_rgba(16,144,113,0.2] bg-gradient-to-r from-[#101111] via-[#101111]/40 to-[#101111]/0 z-10 pointer-events-none"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CTASection;
