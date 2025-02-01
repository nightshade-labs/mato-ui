"use client";

import { VOLUME_PRECISION } from "@/lib/constants";
import { useMatoProgram } from "../mato/mato-data-access";
import { AppHero } from "../ui/ui-layout";
import { PositionCard } from "./position-ui";
import { BN } from "@coral-xyz/anchor";
import { useGetSlot } from "../cluster/cluster-data-access";

export default function PositionsFeature() {
  const {
    getAllPositionA,
    getAllPositionB,
    withdrawTokenA,
    withdrawTokenB,
    closePositionA,
    closePositionB,
    getBookkeepingAccount,
    getMarketAccount,
  } = useMatoProgram();

  const getSlot = useGetSlot();
  let currentSlot = getSlot.data;

  return (
    <div>
      <AppHero title={"Positions"} subtitle={""}></AppHero>
      <div className="flex flex-wrap gap-8 justify-center w-full">
        {getAllPositionA.data &&
          currentSlot &&
          getBookkeepingAccount.data &&
          getMarketAccount.data &&
          getAllPositionA.data.map((data) => (
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
              marketPrice={getMarketAccount.data.tokenBVolume
                .mul(new BN(VOLUME_PRECISION))
                .div(getMarketAccount.data.tokenAVolume)}
            />
          ))}
        {getAllPositionB.data &&
          currentSlot &&
          getBookkeepingAccount.data &&
          getMarketAccount.data &&
          getAllPositionB.data.map((data) => (
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
              marketPrice={getMarketAccount.data.tokenAVolume
                .mul(new BN(VOLUME_PRECISION))
                .div(getMarketAccount.data.tokenBVolume)}
            />
          ))}
      </div>
    </div>
  );
}
