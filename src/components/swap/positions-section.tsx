// "use client";

// import React, { useState, useEffect } from "react";
// import { VOLUME_PRECISION } from "@/lib/constants";
// import { useMatoProgram } from "../mato/mato-data-access";
// import { BN } from "@coral-xyz/anchor";
// import { Button } from "@/components/ui/button";
// import { useGetSlot } from "../cluster/cluster-data-access";
// import Link from "next/link";
// import { SquareArrowOutUpRightIcon } from "lucide-react";
// import { PositionCard } from "../position/position-card";

// export default function PositionsSection() {
//   const {
//     getAllPositionA,
//     getAllPositionB,
//     closePositionA,
//     closePositionB,
//     getBookkeepingAccount,
//     getMarketAccount,
//   } = useMatoProgram();

//   const [showAllPositions, setShowAllPositions] = useState(true);
//   const getSlot = useGetSlot();
//   const currentSlot = getSlot.data || 0;

//   // Set up refetch interval to update the UI automatically when positions change
//   useEffect(() => {
//     // Refetch positions every 10 seconds
//     const refetchInterval = setInterval(() => {
//       getAllPositionA.refetch();
//       getAllPositionB.refetch();
//     }, 10000);

//     return () => clearInterval(refetchInterval);
//   }, [getAllPositionA, getAllPositionB]);

//   // Filter active positions (where current slot is less than end slot)
//   const activePositionsA =
//     getAllPositionA.data?.filter(
//       (data) => currentSlot <= data.account.endSlot.toNumber()
//     ) || [];

//   const activePositionsB =
//     getAllPositionB.data?.filter(
//       (data) => currentSlot <= data.account.endSlot.toNumber()
//     ) || [];

//   // Check if there are positions to display
//   const hasPositions =
//     activePositionsA.length > 0 || activePositionsB.length > 0;

//   if (!hasPositions) {
//     return null;
//   }

//   return (
//     <div className="flex flex-col gap-1">
//       <div className="flex justify-between items-center">
//         <div className="bg-[#102924] px-2.5 py-2.5 rounded-lg">
//           <h3 className="text-[#E9F6F3] font-semibold text-xl">
//             Current Positions
//           </h3>
//         </div>
//         <Link href="/positions">
//           <Button
//             variant="outline"
//             className="text-[#E9F6F3] text-xs font-bold border-[#053A2D] bg-[#102924] rounded-lg h-8 px-3"
//           >
//             All Positions
//             <SquareArrowOutUpRightIcon size={16} />
//           </Button>
//         </Link>
//       </div>

//       <div className="bg-[#102924] p-2.5 rounded-lg flex flex-wrap gap-3">
//         {getBookkeepingAccount.data && getMarketAccount.data && (
//           <>
//             {activePositionsA.length > 0 &&
//               showAllPositions &&
//               activePositionsA.map((data) => {
//                 const { id, amount, startSlot, endSlot } = data.account;
//                 const slot =
//                   currentSlot > endSlot.toNumber()
//                     ? endSlot
//                     : new BN(currentSlot);

//                 // Calculate progress percentage
//                 const totalDuration = endSlot.sub(startSlot).toNumber();
//                 const elapsedDuration = slot.sub(startSlot).toNumber();
//                 const progressPercentage = Math.min(
//                   100,
//                   (elapsedDuration / totalDuration) * 100
//                 );

//                 // Calculate remaining time
//                 const remainingSlots = endSlot.toNumber() - currentSlot;
//                 const remainingTimeSeconds = remainingSlots * 0.4;
//                 const minutes = Math.floor(remainingTimeSeconds / 60);
//                 const seconds = Math.floor(remainingTimeSeconds % 60);
//                 const timeLeftFormatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

//                 // Format average price
//                 const formattedAvgPrice =
//                   (
//                     Number(getBookkeepingAccount.data.bPerA.toString()) /
//                     10 ** 9
//                   ).toFixed(6) + " USDC/SOL";

//                 // Format amounts
//                 const amountSol =
//                   (Number(amount.toString()) / 10 ** 9).toFixed(4) + " SOL";
//                 const amountUsdc =
//                   (
//                     (Number(amount.toString()) / 10 ** 9) *
//                     (Number(getBookkeepingAccount.data.bPerA.toString()) /
//                       10 ** 9)
//                   ).toFixed(2) + " USDC";

//                 return (
//                   <PositionCard
//                     key={data.publicKey.toString()}
//                     id={id.toString()}
//                     tokens={{
//                       from: "SOL",
//                       to: "USDC",
//                       fromIcon: "/solana-sol-logo.png",
//                       toIcon: "/usd-coin-usdc-logo.png",
//                     }}
//                     amountFrom={amountSol}
//                     amountTo={amountUsdc}
//                     avgPrice={formattedAvgPrice}
//                     duration={`${Math.floor((totalDuration * 0.4) / 60)}m`}
//                     progress={progressPercentage}
//                     status="Active"
//                     timeLeft={timeLeftFormatted}
//                     onClose={() => closePositionA.mutate(id)}
//                   />
//                 );
//               })}

//             {activePositionsB.length > 0 &&
//               showAllPositions &&
//               activePositionsB.map((data) => {
//                 const { id, amount, startSlot, endSlot } = data.account;
//                 const slot =
//                   currentSlot > endSlot.toNumber()
//                     ? endSlot
//                     : new BN(currentSlot);

//                 // Calculate progress percentage
//                 const totalDuration = endSlot.sub(startSlot).toNumber();
//                 const elapsedDuration = slot.sub(startSlot).toNumber();
//                 const progressPercentage = Math.min(
//                   100,
//                   (elapsedDuration / totalDuration) * 100
//                 );

//                 // Calculate remaining time
//                 const remainingSlots = endSlot.toNumber() - currentSlot;
//                 const remainingTimeSeconds = remainingSlots * 0.4;
//                 const minutes = Math.floor(remainingTimeSeconds / 60);
//                 const seconds = Math.floor(remainingTimeSeconds % 60);
//                 const timeLeftFormatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

//                 // Format average price
//                 const formattedAvgPrice =
//                   (
//                     10 ** 9 /
//                     Number(getBookkeepingAccount.data.aPerB.toString())
//                   ).toFixed(6) + " SOL/USDC";

//                 // Format amounts
//                 const amountUsdc =
//                   (Number(amount.toString()) / 10 ** 6).toFixed(2) + " USDC";
//                 const amountSol =
//                   (
//                     (Number(amount.toString()) / 10 ** 6) *
//                     (10 ** 9 /
//                       Number(getBookkeepingAccount.data.aPerB.toString()))
//                   ).toFixed(4) + " SOL";

//                 return (
//                   <PositionCard
//                     key={data.publicKey.toString()}
//                     id={id.toString()}
//                     tokens={{
//                       from: "USDC",
//                       to: "SOL",
//                       fromIcon: "/usd-coin-usdc-logo.png",
//                       toIcon: "/solana-sol-logo.png",
//                     }}
//                     amountFrom={amountUsdc}
//                     amountTo={amountSol}
//                     avgPrice={formattedAvgPrice}
//                     duration={`${Math.floor((totalDuration * 0.4) / 60)}m`}
//                     progress={progressPercentage}
//                     status="Active"
//                     timeLeft={timeLeftFormatted}
//                     onClose={() => closePositionB.mutate(id)}
//                   />
//                 );
//               })}
//           </>
//         )}

//         {/* Show a message if there are no active positions */}
//         {activePositionsA.length === 0 && activePositionsB.length === 0 && (
//           <div className="w-full text-center py-8">
//             <p className="text-[#E9F6F3] text-sm">No active positions found</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
