"use client";

import { VOLUME_PRECISION } from "@/lib/constants";
import { useMatoProgram } from "../mato/mato-data-access";
import { AppHero } from "../ui/ui-layout";
import { PositionCard } from "./position-ui";
import { BN } from "@coral-xyz/anchor";

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

  return (
    <div>
      <AppHero title={"Positions"} subtitle={""}></AppHero>
      <div className="flex flex-wrap gap-8 justify-center w-full">
        {getAllPositionA.data &&
          getBookkeepingAccount.data &&
          getMarketAccount.data &&
          getAllPositionA.data.map((data) => (
            <PositionCard
              key={data.publicKey.toString()}
              selling="SOL"
              buying="USDC"
              withdraw={(id: BN) => withdrawTokenB.mutate(id)}
              close={(id: BN) => closePositionA.mutate(id)}
              positionData={data.account}
              decimals={1000000000}
              avgPrice={getBookkeepingAccount.data.bPerA}
              lastSlot={getBookkeepingAccount.data.lastSlot}
              marketPrice={getMarketAccount.data.tokenBVolume
                .mul(new BN(VOLUME_PRECISION))
                .div(getMarketAccount.data.tokenAVolume)}
            />
          ))}
        {getAllPositionB.data &&
          getBookkeepingAccount.data &&
          getMarketAccount.data &&
          getAllPositionB.data.map((data) => (
            <PositionCard
              key={data.publicKey.toString()}
              selling="USDC"
              buying="SOL"
              withdraw={(id: BN) => withdrawTokenA.mutate(id)}
              close={(id: BN) => closePositionB.mutate(id)}
              positionData={data.account}
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
