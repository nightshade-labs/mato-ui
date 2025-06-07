import Image from "next/image";
import React from "react";

const WhyChooseMato = () => {
  const features = [
    {
      icon: (
        <div className="w-12 h-12 relative">
          <Image
            src={"/Shield.png"}
            alt="MEV Protection"
            width={48}
            height={48}
            className="w-full h-full "
          />
        </div>
      ),
      title: "MEV Protection",
      description:
        "Eliminates sandwich attacks and front-running through continuous streaming trades. Orders flow infinitely between blocks, making MEV extraction impossible.",
    },
    {
      icon: (
        <div className="w-12 h-12 relative">
          <Image
            src={"/Gauge.png"}
            alt="Time-Weighted Execution"
            width={25}
            height={25}
            className="w-full h-full"
          />
        </div>
      ),
      title: "Time-Weighted Execution",
      description:
        "Revolutionary TWOB technology streams large orders over time, dramatically reducing price impact. Trade millions without moving the market.",
    },
    {
      icon: (
        <div className="w-12 h-12 relative">
          <Image
            src={"/Scales.png"}
            alt="Fair Market Pricing"
            width={25}
            height={25}
            className="w-full h-full"
          />
        </div>
      ),
      title: "Fair Market Pricing",
      description:
        "All orders trading simultaneously receive the same time-weighted average price. No advantage for sophisticated traders or large institutions.",
    },
  ];

  return (
    <section className="w-full py-16 px-4 flex flex-col items-center gap-12 ">
      {/* Header Section */}
      <div className="flex flex-col items-center gap-2.5 max-w-4xl text-center">
        <h1 className="text-white text-5xl font-medium leading-[1.088]">
          Why Choose Mato?
        </h1>
        <p className="text-white text-lg font-medium font-['Inter'] leading-[1.21] text-center">
          The first Time-Weighted Order Book (TWOB) on Solana. Stream your
          trades continuously and eliminate MEV with revolutionary on-chain
          technology.
        </p>
      </div>

      {/* Cards Section */}
      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-[#101111] border border-[#202626] rounded-2xl p-6 flex flex-col gap-4 shadow-[inset_0_0_50px_-16px_rgba(16,144,113,0.2)] h-full"
            >
              {/* Icon and Title */}
              <div className="flex items-center gap-2.5">
                {feature.icon}

                <h3 className="text-[#E9F6F3] text-lg font-medium font-['Inter'] leading-[1.21]">
                  {feature.title}
                </h3>
              </div>

              {/* Description */}
              <p className="text-[#C5CECC] px-2 text-base font-normal font-['Inter'] leading-[1.21] flex-1">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseMato;
