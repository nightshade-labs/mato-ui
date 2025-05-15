"use client";
import React from "react";
import { Mail, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextEffect } from "@/components/ui/text-effect";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { HeroHeader } from "@/components/hero5-header";
import Image from "next/image";
import { BubbleBackground } from "./animate-ui/bubble-background";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import Link from "next/link";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export default function HeroSection() {
  return (
    <div className="relative" id="hero-section">
      <HeroHeader />
      <div className="bg-gradient-to-t to-transparent absolute inset-0 via-transparent from-black to-70% z-10 "></div>
      <main className="overflow-hidden relative h-screen bg-[url('/fractalMaze.webp')] bg-blend-darken">
        <div
          aria-hidden
          className="absolute inset-0 isolate z-10 hidden opacity-65 contain-strict lg:block"
        >
          <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative mx-auto max-w-6xl px-6 pt-32 lg:pb-16 lg:pt-48">
            <div className="relative z-10 mx-auto max-w-4xl text-center">
              <TextEffect
                preset="fade-in-blur"
                speedSegment={0.3}
                as="h1"
                className="text-balance text-4xl font-medium sm:text-5xl md:text-6xl"
              >
                What Markets were meant to be
              </TextEffect>
              <TextEffect
                per="line"
                preset="fade-in-blur"
                speedSegment={0.3}
                delay={0.5}
                as="p"
                className="mx-auto mt-8 max-w-2xl text-pretty text-lg"
              >
                Mato is a DEX built for fair, bot-protected trading. It serves
                users with an honest trade interest instead of bots, snipers and
                pump'n'dumpers.
              </TextEffect>
              <AnimatedGroup
                variants={{
                  container: {
                    visible: {
                      transition: {
                        staggerChildren: 0.05,
                        delayChildren: 0.75,
                      },
                    },
                  },
                  ...transitionVariants,
                }}
                className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
              >
                <div key={1} className="">
                  <Button
                    asChild
                    size="lg"
                    variant={"default"}
                    className="rounded-xl w-40 border-none outline-none bg-black text-white hover:bg-neutral-800 px-5 text-base"
                  >
                    <Link href="/swap" className="flex items-center gap-2">
                      <span className="text-nowrap">Launch App</span>
                    </Link>
                  </Button>
                </div>
              </AnimatedGroup>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
