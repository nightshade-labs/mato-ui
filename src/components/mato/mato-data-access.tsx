"use client";

import {
  MATO_PROGRAM_ID as programId,
  getProgram,
  Mato,
} from "@project/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
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

  const publicKey = provider.publicKey ?? PublicKey.default;

  let exitsAddress = new PublicKey(
    "4ChXLnj9r3KBuxxv6C2ii9jsmDWJVKyTCRLysPtykHWY"
  );
  let pricesAddress = new PublicKey(
    "4y1XPiQex3TD3TqXXN4UMfkGJRiEgJj81JEDZA1aqGxp"
  );

  let solMint = new PublicKey("ApyFDKqwHGcghiFVQLJ5z6XUcTBjVtasjxjnF22Pvpzm");
  let usdcMint = new PublicKey("2oC4Uu9mQn1KU8FYfL8d5ECi4u2ESQKbb3xTb4wmtJnq");

  let [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), exitsAddress.toBuffer(), pricesAddress.toBuffer()],
    program.programId
  );

  let depositorATA = getAssociatedTokenAddressSync(solMint, publicKey);

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
    refetchInterval: 200,
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
    mutationFn: ({ amount, duration }: { amount: number; duration: number }) =>
      program.methods
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
        .rpc({ skipPreflight: true }),
    onSuccess: (signature) => {
      transactionToast(signature, CREATE_POSITION);
      queryClient.invalidateQueries({
        queryKey: ["get-market", { cluster }],
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
  };
}
