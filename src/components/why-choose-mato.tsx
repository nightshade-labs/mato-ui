import Image from "next/image";
import React from "react";

const WhyChooseMato = () => {
  const features = [
    {
      icon: (
        <div className="w-12 h-12 relative">
          <Image
            src={"/Shield.png"}
            alt="price-impact"
            width={48}
            height={48}
            className="w-full h-full "
          />
        </div>
      ),
      title: "No Value Leakage",
      description:
        "By eliminating extractive strategies like front-running and sandwich attacks, Mato ensures users receive better prices.",
    },
    {
      icon: (
        <div className="w-12 h-12 relative">
          <Image
            src={"/Gauge.png"}
            alt="price-impact"
            width={25}
            height={25}
            className="w-full h-full"
          />
        </div>
      ),
      title: "Low Price Impact",
      description:
        "Large orders are streamed into the market gradually, preventing sudden price swings and giving you more predictable execution.",
    },
    {
      icon: (
        <div className="w-12 h-12 relative">
          <Image
            src={"/Scales.png"}
            alt="price-impact"
            width={25}
            height={25}
            className="w-full h-full"
          />
        </div>
      ),
      title: "Fair Pricing",
      description:
        "Mato ensures everyone trading at the same time gets the same fair price, regardless of order size or trading sophistication.",
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
          Our revolutionary Time-Weighted Order Book technology changes the game
          for crypto traders of all levels.
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
              <p className="text-[#C5CECC] text-base font-normal font-['Inter'] leading-[1.21] flex-1">
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
