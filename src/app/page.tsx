'use client';

import Link from "next/link";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Handshake, ChartCandlestick, Clock, Shield, Rocket } from "lucide-react";
import { animate, inView } from "motion";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48 overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20"
            ref={(el) => {
              if (el) {
                animate(el, { opacity: [0, 1] }, { duration: 1 });
              }
            }}
          />
          <div className="relative px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div 
                className="space-y-2"
                ref={(el) => {
                  if (el) {
                    animate(el, { opacity: [0, 1], y: [20, 0] }, { duration: 0.8 });
                  }
                }}
              >
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
                  The Future of DEX Trading
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Experience the next evolution in decentralized exchanges on Solana,
                  powered by the revolutionary Time-Weighted Order Book (TWOB).
                </p>
              </div>
              <div 
                className="space-x-4"
                ref={(el) => {
                  if (el) {
                    animate(el, { opacity: [0, 1], y: [20, 0] }, { duration: 0.8, delay: 0.2 });
                  }
                }}
              >
                <Button asChild size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                  <Link href="/swap">
                    Start Trading <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="https://thgehr.substack.com/p/twob" target="_blank" rel="noopener noreferrer">
                    Learn About TWOB
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 px-8 xs:px-16 sm:px-32">
          <div className="px-4 md:px-6">
            <h2 
              className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12"
              ref={(el) => {
                if (el) {
                  inView(el, () => {
                    animate(el, { opacity: [0, 1], y: [20, 0] }, { duration: 0.8 });
                  });
                }
              }}
            >
              Revolutionary Features
            </h2>
            <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
              {[
                {
                  icon: <Zap className="h-12 w-12 text-indigo-500" />,
                  title: "Continuous Execution",
                  description: "Trades execute as continuous streams, mitigating price impact and ensuring fair market conditions."
                },
                {
                  icon: <Shield className="h-12 w-12 text-purple-500" />,
                  title: "Fair Markets",
                  description: "Protected against sandwich attacks through smooth, continuous trading and time-weighted execution."
                },
                {
                  icon: <ChartCandlestick className="h-12 w-12 text-pink-500" />,
                  title: "Smart Automation",
                  description: "Trades start and stop when crossing limits, empowering traders to act as if they were market makers."
                }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="flex flex-col items-center space-y-4 p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
                  ref={(el) => {
                    if (el) {
                      inView(el, () => {
                        animate(el, { opacity: [0, 1], y: [20, 0] }, { duration: 0.8, delay: index * 0.2 });
                      });
                    }
                  }}
                >
                  {feature.icon}
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-center text-gray-500 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 px-8 xs:px-16 sm:px-32">
          <div className="px-4 md:px-6">
            <h2 
              className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12"
              ref={(el) => {
                if (el) {
                  inView(el, () => {
                    animate(el, { opacity: [0, 1], y: [20, 0] }, { duration: 0.8 });
                  });
                }
              }}
            >
              How It Works
            </h2>
            <div className="grid gap-10 md:gap-32 sm:grid-cols-2">
              <div
                ref={(el) => {
                  if (el) {
                    inView(el, () => {
                      animate(el, { opacity: [0, 1], x: [-20, 0] }, { duration: 0.8 });
                    });
                  }
                }}
              >
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <Clock className="mr-2 h-6 w-6 text-indigo-500" />
                  Time-Weighted Order Book (TWOB)
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  TWOB revolutionizes trading by introducing time as a key dimension. Your orders are broken down into infinitely small virtual sub-orders that flow continuously into the market, ensuring smooth price transitions and minimizing market impact.
                </p>
              </div>
              <div
                ref={(el) => {
                  if (el) {
                    inView(el, () => {
                      animate(el, { opacity: [0, 1], x: [20, 0] }, { duration: 0.8 });
                    });
                  }
                }}
              >
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <Rocket className="mr-2 h-6 w-6 text-purple-500" />
                  Continuous Trading
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Experience seamless trading that processes orders even between blocks. Our system automatically matches orders at current market prices, determined by real-time supply and demand, creating an efficient and secure trading environment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 px-8 xs:px-16 sm:px-32">
          <div className="px-4 md:px-6">
            <div 
              className="flex flex-col items-center space-y-8 text-center"
              ref={(el) => {
                if (el) {
                  inView(el, () => {
                    animate(el, { opacity: [0, 1], y: [20, 0] }, { duration: 0.8 });
                  });
                }
              }}
            >
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                Ready to Experience the Future?
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                Join us in revolutionizing decentralized trading on Solana with our innovative TWOB technology.
              </p>
              <div className="space-x-4">
                <Button asChild size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                  <Link href="/swap">
                    Start Trading Now <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="https://thgehr.substack.com/p/twob" target="_blank" rel="noopener noreferrer">
                    Learn More About TWOB
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
