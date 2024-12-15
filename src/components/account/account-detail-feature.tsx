"use client";

import { PublicKey } from "@solana/web3.js";
import { useMemo } from "react";

import { useParams } from "next/navigation";

import { ExplorerLink } from "../cluster/cluster-ui";
import { AppHero, ellipsify } from "../ui/ui-layout";
import {
  AccountBalance,
  AccountButtons,
  AccountTokens,
  AccountTransactions,
} from "./account-ui";
import { Button } from "../ui/button";

export default function AccountDetailFeature() {
  const params = useParams();
  const address = useMemo(() => {
    if (!params.address) {
      return;
    }
    try {
      return new PublicKey(params.address);
    } catch (e) {
      console.log(`Invalid public key`, e);
    }
  }, [params]);
  if (!address) {
    return <div>Error loading account</div>;
  }

  return (
    <div>
      <AppHero
        title={<AccountBalance address={address} />}
        subtitle={
          <Button asChild variant="link" className="my-4">
            <ExplorerLink
              path={`account/${address}`}
              label={ellipsify(address.toString())}
            />
          </Button>
        }
      >
        <div className="my-4">
          <AccountButtons address={address} />
        </div>
      </AppHero>
      <div className="space-y-8 flex flex-col items-center">
        <AccountTokens address={address} />
        <AccountTransactions address={address} />
      </div>
    </div>
  );
}
