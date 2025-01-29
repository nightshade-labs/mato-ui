"use client";

import {
  MATO_PROGRAM_ID as programId,
  getProgram,
  Mato,
} from "@project/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
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

export function useMatoProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const program = getProgram(provider);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wallet = useWallet();

  const publicKey = provider.publicKey;

  let exitsAddress = new PublicKey(
    "D467xRNpNHvxbG7nRApDSshnvqVDhL4YjBYqz9TsoKF9"
  );
  let pricesAddress = new PublicKey(
    "Dpe9rm2NFSTowGbvrwXccbW7FtGfrQCdu6ogugNW6akK"
  );

  let solMint = NATIVE_MINT;
  let usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  let [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), exitsAddress.toBuffer(), pricesAddress.toBuffer()],
    program.programId
  );

  const getSolBalance = useQuery({
    queryKey: ["get-sol-balance", { cluster }],
    queryFn: async () => {
      let solATA = getAssociatedTokenAddressSync(solMint, publicKey);
      let wrappedSol;
      try {
        let wrappedSolBalance = await connection.getTokenAccountBalance(
          solATA,
          "finalized"
        );
        wrappedSol =
          wrappedSolBalance.value.uiAmount ||
          parseInt(wrappedSolBalance.value.amount) /
            10 ** wrappedSolBalance.value.decimals;
      } catch (e) {
        wrappedSol = 0;
      }

      let solBalance = await connection.getBalance(publicKey, "confirmed");

      return solBalance / 1000000000 + wrappedSol;
    },
    enabled: !!publicKey,
  });

  const getUSDCBalance = useQuery({
    queryKey: ["get-usdc-balance", { cluster }],
    queryFn: async () => {
      let usdcATA = getAssociatedTokenAddressSync(usdcMint, publicKey);
      return await connection
        .getTokenAccountBalance(usdcATA, "confirmed")
        .then(
          (balance) =>
            balance.value.uiAmount ||
            parseInt(balance.value.amount) / 10 ** balance.value.decimals
        );
    },
    enabled: !!publicKey,
  });

  const [treasuryA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury_a"), marketPda.toBuffer()],
    program.programId
  );

  const [treasuryB] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury_b"), marketPda.toBuffer()],
    program.programId
  );

  const [bookkeepingPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bookkeeping"), marketPda.toBuffer()],
    program.programId
  );

  const getCurrentSlot = useQuery({
    queryKey: ["get-current-slot", { cluster }],
    queryFn: () => connection.getSlot(),
    refetchInterval: 400,
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  const getBookkeepingAccount = useQuery({
    queryKey: ["get-bookkeeping-account", { cluster }],
    queryFn: () => program.account.bookkeeping.fetch(bookkeepingPda),
  });

  const getMarket = useQuery({
    queryKey: ["get-market", { cluster }],
    queryFn: () => program.account.market.fetch(marketPda),
    refetchInterval: 7000,
  });

  const getAllPositionA = useQuery({
    queryKey: ["get-postion-a", { cluster }],
    queryFn: () =>
      program.account.positionA.all([
        {
          memcmp: {
            offset: 8, // discriminator
            bytes: publicKey.toBase58(),
          },
        },
      ]),
  });

  const getAllPositionB = useQuery({
    queryKey: ["get-postion-b", { cluster }],
    queryFn: () =>
      program.account.positionB.all([
        {
          memcmp: {
            offset: 8, // discriminator
            bytes: publicKey.toBase58(),
          },
        },
      ]),
  });

  const depositTokenA = useMutation({
    mutationKey: ["mato", "deposit-token-a", { cluster }],
    mutationFn: async ({
      amount,
      duration,
    }: {
      amount: number;
      duration: number;
    }) => {
      let solATA = getAssociatedTokenAddressSync(solMint, publicKey);
      let amountDiff: number;
      let depositTx = new Transaction();
      try {
        let tokenAmount = await connection.getTokenAccountBalance(solATA);
        amountDiff = amount - parseInt(tokenAmount.value.amount);
      } catch (e) {
        amountDiff = amount;
        depositTx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            solATA,
            publicKey,
            NATIVE_MINT
          )
        );
      }

      if (amountDiff > 0) {
        depositTx.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
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
            tokenMintA: solMint,
            // market: marketPda,
            // positionA: positionAPda,
            // treasuryA: treasuryA,
            // bookkeeping: bookkeeping,
            exits: exitsAddress,
            prices: pricesAddress,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .transaction()
      );

      return wallet.sendTransaction(depositTx, connection);
    },
    onSuccess: (signature) => {
      transactionToast(signature, CREATE_POSITION);
      queryClient.invalidateQueries({
        queryKey: ["get-market", { cluster }],
      });
      queryClient.invalidateQueries({
        queryKey: ["get-usdc-balance", { cluster }],
      });
      queryClient.invalidateQueries({
        queryKey: ["get-sol-balance", { cluster }],
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
    mutationKey: ["mato", "deposit-token-b", { cluster }],
    mutationFn: ({ amount, duration }: { amount: number; duration: number }) =>
      program.methods
        .depositTokenB(new BN(Date.now()), new BN(amount), new BN(duration))
        .accounts({
          depositor: provider.publicKey,
          // depositorTokenAccount: depositorATA,
          tokenMintB: usdcMint,
          // market: marketPda,
          // positionB: positionAPda,
          // treasuryB: treasuryA,
          // bookkeeping: bookkeeping,
          exits: exitsAddress,
          prices: pricesAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true }),
    onSuccess: (signature) => {
      transactionToast(signature, CREATE_POSITION);
      queryClient.invalidateQueries({
        queryKey: ["get-market", { cluster }],
      });
      queryClient.invalidateQueries({
        queryKey: ["get-usdc-balance", { cluster }],
      });
      queryClient.invalidateQueries({
        queryKey: ["get-sol-balance", { cluster }],
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
    mutationKey: ["mato", "withdraw-token-a", { cluster }],
    mutationFn: (id: BN) => {
      const [positionBPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position_b"),
          marketPda.toBuffer(),
          publicKey.toBuffer(),
          id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      return program.methods
        .withdrawSwappedTokenA()
        .accountsPartial({
          withdrawer: provider.publicKey,
          // depositorTokenAccount: depositorATA,
          tokenMintA: solMint,
          // market: marketPda,
          positionB: positionBPda,
          // treasuryB: treasuryA,
          // bookkeeping: bookkeepingPda,
          exits: exitsAddress,
          prices: pricesAddress,
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
    mutationKey: ["mato", "withdraw-token-b", { cluster }],
    mutationFn: (id: BN) => {
      const [positionAPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position_a"),
          marketPda.toBuffer(),
          publicKey.toBuffer(),
          id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      return program.methods
        .withdrawSwappedTokenB()
        .accountsPartial({
          withdrawer: provider.publicKey,
          // depositorTokenAccount: depositorATA,
          tokenMintB: usdcMint,
          // market: marketPda,
          positionA: positionAPda,
          // treasuryB: treasuryA,
          // bookkeeping: bookkeeping,
          exits: exitsAddress,
          prices: pricesAddress,
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
    mutationKey: ["mato", "close-position-a", { cluster }],
    mutationFn: (id: BN) => {
      const [positionAPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position_a"),
          marketPda.toBuffer(),
          publicKey.toBuffer(),
          id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      return program.methods
        .closePositionA()
        .accountsPartial({
          signer: provider.publicKey,
          // depositorTokenAccount: depositorATA,
          tokenMintA: solMint,
          tokenMintB: usdcMint,
          // market: marketPda,
          positionA: positionAPda,
          // treasuryB: treasuryA,
          // bookkeeping: bookkeeping,
          exits: exitsAddress,
          prices: pricesAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true });
    },
    onSuccess: (signature) => {
      transactionToast(signature, CLOSE_POSITION);
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Failed to close position!",
        description: e.message,
      }),
  });

  const closePositionB = useMutation({
    mutationKey: ["mato", "close-position-b", { cluster }],
    mutationFn: (id: BN) => {
      const [positionBPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position_b"),
          marketPda.toBuffer(),
          publicKey.toBuffer(),
          id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      return program.methods
        .closePositionB()
        .accountsPartial({
          signer: provider.publicKey,
          // depositorTokenAccount: depositorATA,
          tokenMintA: solMint,
          tokenMintB: usdcMint,
          // market: marketPda,
          positionB: positionBPda,
          // treasuryB: treasuryA,
          // bookkeeping: bookkeeping,
          exits: exitsAddress,
          prices: pricesAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true });
    },
    onSuccess: (signature) => {
      transactionToast(signature, CLOSE_POSITION);
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
    getProgramAccount,
    depositTokenA,
    depositTokenB,
    getMarket,
    getAllPositionA,
    getAllPositionB,
    withdrawTokenA,
    withdrawTokenB,
    closePositionA,
    closePositionB,
    getCurrentSlot,
    getBookkeepingAccount,
    getSolBalance,
    getUSDCBalance,
  };
}
