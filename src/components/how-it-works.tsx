import React from "react";
import Image from "next/image";

const HowItWorks = () => {
  return (
    <div className="flex flex-col max-w-7xl mx-auto items-center px-2.5 py-0 gap-12 w-full">
      {/* Header Section */}
      <div className="flex flex-col items-center gap-2.5 p-2.5 w-full">
        <h1 className="text-4xl max-md:text-center lg:text-5xl font-medium text-white font-archivo">
          Trading as a Stream
        </h1>
        <p className="text-lg text-balance max-w-5xl font-medium text-center text-white/80 leading-[1.21]">
          Instead of treating trades as instant, all-or-nothing events, Mato
          executes orders continuously over time.
        </p>
      </div>

      {/* Cards Section */}
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col lg:flex-row justify-stretch items-stretch gap-6 w-full">
          {/* Card 1: Set Your Trade Parameters */}
          <div className="flex flex-col gap-5 p-6 bg-[#101111] border border-[#202626] rounded-2xl flex-1 shadow-[inset_0px_0px_50px_-16px_rgba(16,144,113,0.2)]">
            <div className="px-3">
              <h1 className="text-lg font-medium text-[#E9F6F3]">
                Set Your Trade Parameters
              </h1>
              <p className="text-base mt-6 font-normal text-[#C5CECC] leading-[1.21]">
                Choose how much you want to trade, set your preferred duration,
                and define your limit price. With just these three settings,
                you're ready to trade smarter on Solana.
              </p>
            </div>

            {/* Trading Interface Mock */}
            <Image
              src="/trading-interface.png"
              alt="Mato"
              width={600}
              height={600}
              className="w-full"
            />
          </div>

          {/* Card 2: Gradual Execution Begins */}
          <div className="flex flex-col gap-5 p-6 bg-[#101111] border border-[#202626] rounded-2xl flex-1  shadow-[inset_0px_0px_50px_-16px_rgba(16,144,113,0.2)]">
            <div className="px-3">
              <h1 className="text-lg font-medium text-[#E9F6F3]">
                Gradual Execution Begins
              </h1>
              <p className="text-base font-normal mt-6 text-[#C5CECC] leading-[1.21]">
                Your trade streams gradually into the market over your selected
                duration. This innovative approach ensures fair pricing, reduces
                price impact, and eliminates the risk of front-running bots.
              </p>
            </div>

            {/* Chart Interface */}
            <Image
              src="/chart-interface.png"
              alt="Chart Interface"
              width={1200}
              height={1200}
              className="w-full"
            />
          </div>
        </div>

        {/* Card 3: Monitor & Complete Your Trade - Full Width */}
        <div className="flex flex-col lg:flex-row justify-stretch items-stretch gap-10 p-6 bg-[#101111] border border-[#202626] rounded-2xl w-full shadow-[inset_0px_0px_50px_-16px_rgba(16,144,113,0.2)]">
          {/* Left Content */}
          <div className="flex px-2 flex-col justify-between gap-5 flex-1">
            <h1 className="text-lg font-medium text-[#E9F6F3]">
              Monitor & Complete Your Trade
            </h1>
            <p className="text-base lg:mb-6 font-normal text-[#C5CECC] leading-[1.21]">
              Easily monitor your trade's progress in real-time. If market
              prices align with your limit, your trade executes; if not, your
              funds automatically return to you safely after the duration ends.
            </p>
          </div>

          {/* Right Progress Panel */}
          <Image
            src="/streaming-panel.png"
            alt="Progress Panel"
            width={600}
            height={600}
            className="w-full lg:w-[48%]"
          />
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
