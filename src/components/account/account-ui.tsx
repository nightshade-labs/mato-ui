"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useCluster } from "../cluster/cluster-data-access";
import {
  useGetBalance,
  useGetTokenBalance,
  useRequestAirdrop,
} from "./account-data-access";

import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { NATIVE_MINT } from "@solana/spl-token";
import Link from "next/link";

export function AccountBalance({
  address,
  classname,
  decimals = 6,
}: {
  address: PublicKey;
  classname?: string;
  decimals?: number;
}) {
  const getBalanceQuery = useGetBalance({ address });
  const getTokenBalanceQuery = useGetTokenBalance({
    address,
    mintAddress: NATIVE_MINT,
  });

  const balance =
    getBalanceQuery.data !== undefined &&
    getTokenBalanceQuery.data !== undefined
      ? getBalanceQuery.data +
        parseInt(getTokenBalanceQuery.data?.value.amount || "0")
      : undefined;

  return (
    <div className={cn(classname)}>
      {balance ? (
        <span>{(balance / LAMPORTS_PER_SOL).toFixed(decimals)}</span>
      ) : (
        "..."
      )}
    </div>
  );
}

export function AccountTokenBalance({
  address,
  mintAddress,
  classname,
  decimals = 6,
}: {
  address: PublicKey;
  mintAddress: PublicKey;
  classname?: string;
  decimals?: number;
}) {
  const getTokenBalanceQuery = useGetTokenBalance({
    address,
    mintAddress: mintAddress,
  });

  return (
    <div className={cn(classname)}>
      {getTokenBalanceQuery.data ? (
        <span>
          {(
            parseInt(getTokenBalanceQuery.data.value.amount) /
            10 ** getTokenBalanceQuery.data.value.decimals
          ).toFixed(decimals)}
        </span>
      ) : (
        "..."
      )}
    </div>
  );
}

export function AccountChecker() {
  const { publicKey } = useWallet();
  if (!publicKey) {
    return null;
  }
  return <AccountBalanceCheck address={publicKey} />;
}
export function AccountBalanceCheck({ address }: { address: PublicKey }) {
  const { cluster } = useCluster();
  const mutation = useRequestAirdrop({ address });
  const query = useGetBalance({ address });

  if (query.isLoading) {
    return null;
  }
  if (query.isError || !query.data) {
    return (
      <Alert className="flex justify-center rounded-none bg-destructive">
        <div className="flex gap-4">
          <MagicWandIcon className="h-4 w-4" />
          <div>
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              <span>
                You are connected to <strong>{cluster.name}</strong> but your
                account is not found on this cluster.
              </span>
            </AlertDescription>
            <div>
              Get SOL on this{" "}
              <Link
                className="font-bold underline"
                href={"https://faucet.solana.com/"}
                target="_blank"
                rel="noreferrer"
              >
                Faucet
              </Link>
            </div>
            {/* <Button
              size={"sm"}
              onClick={() =>
                mutation.mutateAsync(1).catch((err) => console.log(err))
              }
            >
              Request Airdrop
            </Button> */}
          </div>
        </div>
      </Alert>
    );
  }
  return null;
}
