"use client";
import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { textVariant } from "@/lib/anims";

const SocialProof = () => {
  return (
    <div
      id="social-proof"
      className="flex flex-col mt-16 items-center px-2.5 py-0 gap-12 w-full"
    >
      {/* Header Section */}
      <div className="flex flex-col items-center gap-2.5 p-2.5 w-full">
        <motion.h1
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-4xl max-md:text-center lg:text-5xl font-medium text-white font-archivo"
        >
          We Have More Than Just Traction
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          viewport={{ once: true }}
          className="lg:text-lg font-medium max-w-5xl text-balance text-center text-white/80 leading-[1.21]"
        >
          Discover why leading crypto organizations and events trust and
          recognize MATO's innovative approach—validated by strategic
          partnerships, hackathon success, and industry collaborations.
        </motion.p>
      </div>

      {/* Cards Section */}
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Card 1: Breakout Hackathon */}
          <motion.div
            initial="hidden"
            whileInView={"show"}
            variants={textVariant(0.3)}
            viewport={{ once: true }}
            className="flex flex-col lg:w-1/3 gap-5 p-6 bg-[#101111] border border-[#202626] rounded-2xl flex-1 shadow-[inset_0px_0px_50px_-16px_rgba(16,144,113,0.2)]"
          >
            {/* Logo Container */}
            <div className="flex flex-col justify-center items-center gap-2.5 p-5 bg-gradient-to-b from-[#091F1A] to-[#144238] rounded-lg h-[163px]">
              <div className="relative w-full h-[130px]">
                {/* Breakout Logo - Using SVG placeholder since it's complex */}
                <Image
                  src={"/breakout.png"}
                  alt="Breakout Hackathon"
                  width={400}
                  height={130}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <h3 className="text-lg font-medium text-[#E9F6F3]">
              Breakout Hackathon
            </h3>
            <p className="text-base font-normal text-[#C5CECC] leading-[1.21]">
              MATO stood out at the Breakout Hackathon, earning special
              invitations to an exclusive UI/UX roast and the opportunity to
              pitch directly to prominent investors.
            </p>
          </motion.div>

          {/* Card 2: Builders Mansion France */}
          <motion.div
            initial="hidden"
            whileInView={"show"}
            variants={textVariant(0.4)}
            viewport={{ once: true }}
            className="flex flex-col lg:w-1/3 gap-5 p-6 bg-[#101111] border border-[#202626] rounded-2xl flex-1 shadow-[inset_0px_0px_50px_-16px_rgba(16,144,113,0.2)]"
          >
            <div className="w-full h-[147px] rounded-lg overflow-hidden">
              <Image
                src="/builders-mansion.png"
                alt="Builders Mansion France"
                width={400}
                height={240}
                className="w-full h-full object-cover"
              />
            </div>

            <h3 className="text-lg font-medium text-[#E9F6F3]">
              Builders Mansion France
            </h3>
            <p className="text-base font-normal text-[#C5CECC] leading-[1.21]">
              Selected among numerous outstanding projects, MATO will present at
              the exclusive Builders Mansion event in France from June 16–22,
              2025, pitching directly to prominent Web3 investors and industry
              leaders.
            </p>
          </motion.div>

          {/* Card 3: Superteam Germany */}
          <motion.div
            initial="hidden"
            whileInView={"show"}
            variants={textVariant(0.5)}
            viewport={{ once: true }}
            className="flex flex-col justify-between lg:w-1/3 gap-2.5 p-6 bg-[#101111] border border-[#202626] rounded-2xl w-fit shadow-[inset_0px_0px_50px_-16px_rgba(16,144,113,0.2)]"
          >
            <div className="w-full rounded-lg overflow-hidden">
              <Image
                src="/superteam-germany.png"
                alt="Superteam Germany"
                width={300}
                height={240}
                className="w-full h-full  object-cover"
              />
            </div>
            <div>
              <h3 className="text-lg mb-4 font-medium text-[#E9F6F3]">
                Superteam Germany
              </h3>
              <p className="text-base font-normal text-[#C5CECC] leading-[1.21]">
                Strategically partnered with Superteam Germany, connecting MATO
                to Solana ecosystem leaders and blockchain experts.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SocialProof;
