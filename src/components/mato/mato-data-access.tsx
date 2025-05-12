"use client";

import { MATO_PROGRAM_ID as programId, getProgram } from "@project/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { useToast } from "@/hooks/use-toast";
import { CLOSE_POSITION, CREATE_POSITION, WITHDRAW_TOKENS } from "@/lib/texts";
import { EXITS_ADDRESS, PRICES_ADDRESS, USDC_MINT } from "@/lib/constants";
import {
  CLOSE_POSITION_A,
  CLOSE_POSITION_B,
  DEPOSIT_TOKEN_A,
  DEPOSIT_TOKEN_B,
  GET_BALANCE,
  GET_BOOKKEEPING_ACCOUNT,
  GET_MARKET_ACCOUNT,
  GET_ALL_POSITION_A,
  GET_ALL_POSITION_B,
  GET_TOKEN_BALANCE,
  WITHDRAW_TOKEN_A,
  WITHDRAW_TOKEN_B,
} from "@/lib/query-keys";

export function useMatoProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const program = getProgram(provider);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wallet = useWallet();

  ////////////////////////////////////////////////////////////////
  ///////////////////////////// PDAs /////////////////////////////
  ////////////////////////////////////////////////////////////////

  let [marketPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("market"),
      EXITS_ADDRESS.toBuffer(),
      PRICES_ADDRESS.toBuffer(),
    ],
    program.programId
  );

  const [bookkeepingPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bookkeeping"), marketPda.toBuffer()],
    program.programId
  );

  ////////////////////////////////////////////////////////////////
  //////////////////////////// Queries ///////////////////////////
  ////////////////////////////////////////////////////////////////

  const getBookkeepingAccount = useQuery({
    queryKey: [GET_BOOKKEEPING_ACCOUNT, { cluster }],
    queryFn: () => program.account.bookkeeping.fetch(bookkeepingPda),
  });

  const getMarketAccount = useQuery({
    queryKey: [GET_MARKET_ACCOUNT, { cluster }],
    queryFn: () => program.account.market.fetch(marketPda),
    refetchInterval: 5000,
  });

  const getAllPositionA = useQuery({
    queryKey: [GET_ALL_POSITION_A, { cluster }],
    queryFn: () =>
      program.account.positionA.all([
        {
          memcmp: {
            offset: 8, // discriminator
            bytes: provider.publicKey.toBase58(),
          },
        },
      ]),
  });

  const getAllPositionB = useQuery({
    queryKey: [GET_ALL_POSITION_B, { cluster }],
    queryFn: () =>
      program.account.positionB.all([
        {
          memcmp: {
            offset: 8, // discriminator
            bytes: provider.publicKey.toBase58(),
          },
        },
      ]),
  });

  ////////////////////////////////////////////////////////////////
  /////////////////////////// Mutations //////////////////////////
  ////////////////////////////////////////////////////////////////

  const depositTokenA = useMutation({
    mutationKey: [DEPOSIT_TOKEN_A, { cluster }],
    mutationFn: async ({
      amount,
      duration,
    }: {
      amount: number;
      duration: number;
    }) => {
      let solATA = getAssociatedTokenAddressSync(
        NATIVE_MINT,
        provider.publicKey
      );
      let amountDiff: number;
      let depositTx = new Transaction();
      try {
        let tokenAmount = await connection.getTokenAccountBalance(solATA);
        amountDiff = amount - parseInt(tokenAmount.value.amount);
      } catch (e) {
        amountDiff = amount;
        depositTx.add(
          createAssociatedTokenAccountInstruction(
            provider.publicKey,
            solATA,
            provider.publicKey,
            NATIVE_MINT
          )
        );
      }

      if (amountDiff > 0) {
        depositTx.add(
          SystemProgram.transfer({
            fromPubkey: provider.publicKey,
            toPubkey: solATA,
            lamports: amountDiff,
          }),
          createSyncNativeInstruction(solATA)
        );
      }
      depositTx.add(
        await program.methods
          .depositTokenA(new BN(Date.now()), new BN(amount), new BN(duration))
          .accounts({
            depositor: provider.publicKey,
            // depositorTokenAccount: depositorATA,
            tokenMintA: NATIVE_MINT,
            // market: marketPda,
            // positionA: positionAPda,
            // treasuryA: treasuryA,
            // bookkeeping: bookkeeping,
            exits: EXITS_ADDRESS,
            prices: PRICES_ADDRESS,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .transaction()
      );

      let txSig = await wallet.sendTransaction(depositTx, connection);
      let blockhash = await provider.connection.getLatestBlockhash();

      await connection.confirmTransaction(
        {
          signature: txSig,
          ...blockhash,
        },
        "confirmed"
      );

      return txSig;
    },
    onSuccess: (signature) => {
      transactionToast(signature, CREATE_POSITION);
      queryClient.invalidateQueries({
        queryKey: [GET_MARKET_ACCOUNT, { cluster }],
      });
      queryClient.invalidateQueries({
        queryKey: [GET_BALANCE, { cluster, address: provider.publicKey }],
      });
      queryClient.invalidateQueries({
        queryKey: [GET_ALL_POSITION_A, { cluster }],
      });
      queryClient.refetchQueries({
        queryKey: [GET_ALL_POSITION_A, { cluster }],
      });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Failed to create position!",
        description: e.message,
      }),
  });

  const depositTokenB = useMutation({
    mutationKey: [DEPOSIT_TOKEN_B, { cluster }],
    mutationFn: ({ amount, duration }: { amount: number; duration: number }) =>
      program.methods
        .depositTokenB(new BN(Date.now()), new BN(amount), new BN(duration))
        .accounts({
          depositor: provider.publicKey,
          // depositorTokenAccount: depositorATA,
          tokenMintB: USDC_MINT,
          // market: marketPda,
          // positionB: positionAPda,
          // treasuryB: treasuryA,
          // bookkeeping: bookkeeping,
          exits: EXITS_ADDRESS,
          prices: PRICES_ADDRESS,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true }),
    onSuccess: (signature) => {
      transactionToast(signature, CREATE_POSITION);
      queryClient.invalidateQueries({
        queryKey: [GET_MARKET_ACCOUNT, { cluster }],
      });
      queryClient.invalidateQueries({
        queryKey: [
          GET_TOKEN_BALANCE,
          { cluster, address: provider.publicKey, mintAddress: USDC_MINT },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [GET_ALL_POSITION_B, { cluster }],
      });
      queryClient.refetchQueries({
        queryKey: [GET_ALL_POSITION_B, { cluster }],
      });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Failed to create position!",
        description: e.message,
      }),
  });

  const withdrawTokenA = useMutation({
    mutationKey: [WITHDRAW_TOKEN_A, { cluster }],
    mutationFn: (id: BN) => {
      const [positionBPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position_b"),
          marketPda.toBuffer(),
          provider.publicKey.toBuffer(),
          id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      return program.methods
        .withdrawSwappedTokenA()
        .accountsPartial({
          withdrawer: provider.publicKey,
          // depositorTokenAccount: depositorATA,
          tokenMintA: NATIVE_MINT,
          // market: marketPda,
          positionB: positionBPda,
          // treasuryB: treasuryA,
          // bookkeeping: bookkeepingPda,
          exits: EXITS_ADDRESS,
          prices: PRICES_ADDRESS,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true });
    },
    onSuccess: (signature) => {
      transactionToast(signature, WITHDRAW_TOKENS);
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Failed to withdraw tokens!",
        description: e.message,
      }),
  });

  const withdrawTokenB = useMutation({
    mutationKey: [WITHDRAW_TOKEN_B, { cluster }],
    mutationFn: (id: BN) => {
      const [positionAPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position_a"),
          marketPda.toBuffer(),
          provider.publicKey.toBuffer(),
          id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      return program.methods
        .withdrawSwappedTokenB()
        .accountsPartial({
          withdrawer: provider.publicKey,
          // depositorTokenAccount: depositorATA,
          tokenMintB: USDC_MINT,
          // market: marketPda,
          positionA: positionAPda,
          // treasuryB: treasuryA,
          // bookkeeping: bookkeeping,
          exits: EXITS_ADDRESS,
          prices: PRICES_ADDRESS,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true });
    },
    onSuccess: (signature) => {
      transactionToast(signature, WITHDRAW_TOKENS);
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Failed to withdraw tokens!",
        description: e.message,
      }),
  });

  const closePositionA = useMutation({
    mutationKey: [CLOSE_POSITION_A, { cluster }],
    mutationFn: (id: BN) => {
      const [positionAPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position_a"),
          marketPda.toBuffer(),
          provider.publicKey.toBuffer(),
          id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      return program.methods
        .closePositionA()
        .accountsPartial({
          signer: provider.publicKey,
          // depositorTokenAccount: depositorATA,
          tokenMintA: NATIVE_MINT,
          tokenMintB: USDC_MINT,
          // market: marketPda,
          positionA: positionAPda,
          // treasuryB: treasuryA,
          // bookkeeping: bookkeeping,
          exits: EXITS_ADDRESS,
          prices: PRICES_ADDRESS,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true });
    },
    onSuccess: (signature) => {
      transactionToast(signature, CLOSE_POSITION);
      queryClient.invalidateQueries({
        queryKey: [GET_ALL_POSITION_A, { cluster }],
      });
      queryClient.invalidateQueries({
        queryKey: [GET_MARKET_ACCOUNT, { cluster }],
      });
      queryClient.invalidateQueries({
        queryKey: [GET_BALANCE, { cluster, address: provider.publicKey }],
      });
      queryClient.invalidateQueries({
        queryKey: [
          GET_TOKEN_BALANCE,
          { cluster, address: provider.publicKey, mintAddress: USDC_MINT },
        ],
      });
      queryClient.refetchQueries({
        queryKey: [GET_ALL_POSITION_A, { cluster }],
      });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Failed to close position!",
        description: e.message,
      }),
  });

  const closePositionB = useMutation({
    mutationKey: [CLOSE_POSITION_B, { cluster }],
    mutationFn: (id: BN) => {
      const [positionBPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position_b"),
          marketPda.toBuffer(),
          provider.publicKey.toBuffer(),
          id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      return program.methods
        .closePositionB()
        .accountsPartial({
          signer: provider.publicKey,
          // depositorTokenAccount: depositorATA,
          tokenMintA: NATIVE_MINT,
          tokenMintB: USDC_MINT,
          // market: marketPda,
          positionB: positionBPda,
          // treasuryB: treasuryA,
          // bookkeeping: bookkeeping,
          exits: EXITS_ADDRESS,
          prices: PRICES_ADDRESS,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true });
    },
    onSuccess: (signature) => {
      transactionToast(signature, CLOSE_POSITION);
      queryClient.invalidateQueries({
        queryKey: [GET_ALL_POSITION_B, { cluster }],
      });
      queryClient.invalidateQueries({
        queryKey: [GET_MARKET_ACCOUNT, { cluster }],
      });
      queryClient.invalidateQueries({
        queryKey: [GET_BALANCE, { cluster, address: provider.publicKey }],
      });
      queryClient.invalidateQueries({
        queryKey: [
          GET_TOKEN_BALANCE,
          { cluster, address: provider.publicKey, mintAddress: USDC_MINT },
        ],
      });
      queryClient.refetchQueries({
        queryKey: [GET_ALL_POSITION_B, { cluster }],
      });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Failed to close position!",
        description: e.message,
      }),
  });

  return {
    program,
    programId,
    depositTokenA,
    depositTokenB,
    getMarketAccount,
    getAllPositionA,
    getAllPositionB,
    withdrawTokenA,
    withdrawTokenB,
    closePositionA,
    closePositionB,
    getBookkeepingAccount,
  };
}
