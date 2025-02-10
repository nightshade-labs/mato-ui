"use client";

import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTransactionToast } from "../ui/ui-layout";
import { AIRDROP } from "@/lib/texts";
import { useCluster } from "../cluster/cluster-data-access";
import { GET_BALANCE, GET_TOKEN_BALANCE } from "@/lib/query-keys";

export function useGetBalance({ address }: { address: PublicKey }) {
  const { connection } = useConnection();
  const { cluster } = useCluster();

  return useQuery({
    queryKey: [GET_BALANCE, { cluster, address }],
    queryFn: () => connection.getBalance(address),
    enabled: !!address,
  });
}

export function useGetTokenBalance({
  address,
  mintAddress,
}: {
  address: PublicKey;
  mintAddress: PublicKey;
}) {
  const { connection } = useConnection();
  const { cluster } = useCluster();

  return useQuery({
    queryKey: [GET_TOKEN_BALANCE, { cluster, address, mintAddress }],
    queryFn: async () => {
      let ata = getAssociatedTokenAddressSync(mintAddress, address);
      let accountInfo = await connection.getAccountInfo(ata);
      if (accountInfo === null) {
        return null;
      }

      return connection.getTokenAccountBalance(ata, "confirmed");
    },
    enabled: !!address,
  });
}

export function useGetSignatures({ address }: { address: PublicKey }) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["get-signatures", { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getSignaturesForAddress(address),
  });
}

export function useGetTokenAccounts({ address }: { address: PublicKey }) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: [
      "get-token-accounts",
      { endpoint: connection.rpcEndpoint, address },
    ],
    queryFn: async () => {
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(address, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(address, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);
      return [...tokenAccounts.value, ...token2022Accounts.value];
    },
  });
}

export function useRequestAirdrop({ address }: { address: PublicKey }) {
  const { connection } = useConnection();
  const transactionToast = useTransactionToast();
  const client = useQueryClient();

  return useMutation({
    mutationKey: ["airdrop", { endpoint: connection.rpcEndpoint, address }],
    mutationFn: async (amount: number = 10) => {
      console.log("Airdropping", amount);
      const [latestBlockhash, signature] = await Promise.all([
        connection.getLatestBlockhash(),
        connection.requestAirdrop(address, amount * LAMPORTS_PER_SOL),
      ]);

      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );
      return signature;
    },
    onSuccess: (signature) => {
      transactionToast(signature, AIRDROP);
      return Promise.all([
        client.invalidateQueries({
          queryKey: [
            GET_BALANCE,
            { endpoint: connection.rpcEndpoint, address },
          ],
        }),
        client.invalidateQueries({
          queryKey: [
            "get-signatures",
            { endpoint: connection.rpcEndpoint, address },
          ],
        }),
      ]);
    },
  });
}
