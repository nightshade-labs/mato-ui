import Link from "next/link";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Handshake, ChartCandlestick } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-red-500/10 to-purple-500/10">
          <div className="px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Welcome to Mato
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  The next evolution in decentralized exchanges on Solana,
                  powered by the Time-Weighted Order Book (TWOB).
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild>
                  <Link href="/swap">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                {/* <Button variant="outline">Learn More</Button> */}
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="w-full py-12 md:py-24 lg:py-32 px-8 xs:px-16 sm:px-32"
        >
          <div className="px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12">
              Features
            </h2>
            <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
              <div className="flex flex-col items-center space-y-4">
                <Zap className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Continuous Execution</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Trades execute as continuous streams, mitigating price impact.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <Handshake className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Fair Markets</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Prioritize user intent over speed and mitigate sandwich attack
                  trough smooth, continuous trading.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <ChartCandlestick className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">
                  Built-in Trading Automation
                </h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Trades start and stop when crossing limits, empowering traders
                  to act as if they where market makers.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-purple-500/10 to-red-500/10 px-8 xs:px-16 sm:px-32"
        >
          <div className="px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12">
              How It Works
            </h2>
            <div className="grid gap-10 md:gap-32 sm:grid-cols-2">
              <div>
                <h3 className="text-xl font-bold mb-4">
                  Time-Weighted Order Book (TWOB)
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  TWOB adds a new dimension to trading: time. Your large orders
                  are broken down into infinitely many infinitely small virtual
                  sub-orders that flow continuously into the market, ensuring
                  smooth price transitions and mitigating large market impacts.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4">Continuous Trading</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  At any moment, all matching orders automatically trade at the
                  current market price, determined by real-time supply and
                  demand. This creates a market so smooth that it processes
                  trades even between blocks, enhancing efficiency and security.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
