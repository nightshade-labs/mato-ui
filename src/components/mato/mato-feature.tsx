"use client";

import { Card } from "../ui/card";
import { SwapInterface } from "./mato-ui";

export default function MatoFeature() {
  console.log("MatoFeature, RPC_URL", process.env.RPC_KEY);
  return (
    <div className="flex flex-col-reverse lg:flex-row gap-8 justify-center py-24">
      <Card className="w-full lg:w-1/2 min-h-40 flex items-center justify-center">
        Price Chart coming soon
      </Card>
      <SwapInterface />
    </div>
  );
}
