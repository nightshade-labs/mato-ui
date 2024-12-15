"use client";

import { useMatoProgram } from "../mato/mato-data-access";
import { AppHero } from "../ui/ui-layout";
import { PositionCard } from "./position-ui";
import { BN } from "@coral-xyz/anchor";

export default function PositionsFeature() {
  const {
    getAllPositionA: getPositionA,
    getAllPositionB: getPositionB,
    withdrawTokenA,
    withdrawTokenB,
    closePositionA,
    closePositionB,
    getCurrentSlot,
    getBookkeepingAccount,
    getMarket,
  } = useMatoProgram();

  let currentSlot = getCurrentSlot.data;

  return (
    <div>
      <AppHero title={"Positions"} subtitle={"Manage your positions"}></AppHero>
      <div className="flex flex-wrap gap-8 justify-center w-full">
        {getPositionA.data &&
          currentSlot &&
          getBookkeepingAccount.data &&
          getMarket.data &&
          getPositionA.data.map((data) => (
            <PositionCard
              key={currentSlot.toString() + data.publicKey.toString()}
              selling="tSOL"
              buying="tUSDC"
              withdraw={(id: BN) => withdrawTokenB.mutate(id)}
              close={(id: BN) => closePositionA.mutate(id)}
              positionData={data.account}
              currentSlot={currentSlot}
              decimals={1000000000}
              avgPrice={getBookkeepingAccount.data.bPerA}
              lastSlot={getBookkeepingAccount.data.lastSlot}
              marketPrice={getMarket.data.tokenBVolume
                .mul(new BN(1000000))
                .div(getMarket.data.tokenAVolume)}
            />
          ))}
        {getPositionB.data &&
          currentSlot &&
          getBookkeepingAccount.data &&
          getMarket.data &&
          getPositionB.data.map((data) => (
            <PositionCard
              key={currentSlot.toString() + data.publicKey.toString()}
              selling="tUSDC"
              buying="tSOL"
              withdraw={(id: BN) => withdrawTokenA.mutate(id)}
              close={(id: BN) => closePositionB.mutate(id)}
              positionData={data.account}
              currentSlot={currentSlot}
              decimals={1000000}
              avgPrice={getBookkeepingAccount.data.aPerB}
              lastSlot={getBookkeepingAccount.data.lastSlot}
              marketPrice={getMarket.data.tokenAVolume
                .mul(new BN(1000000))
                .div(getMarket.data.tokenBVolume)}
            />
          ))}
      </div>
    </div>
  );
}
