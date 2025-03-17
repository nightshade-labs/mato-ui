import * as anchor from "@coral-xyz/anchor";
import {
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { getProgram } from "../anchor/src";

import { BN } from "@coral-xyz/anchor";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { idWallet, loadKeypairFromFile } from "./helpers";

process.env.ANCHOR_PROVIDER_URL = "https://api.testnet.sonic.game";
// process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET = idWallet;

const EXITS_ACCOUNT_SIZE = 8000024; // check account size in program
const PRICES_ACCOUNT_SIZE = 10000008; // check account size in program

// Original USCD mint address
// const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Need to first run create mint script and insert the mint addresses here
const SOL_MINT = NATIVE_MINT;
const USDC_MINT = new PublicKey("GbkB1LkDEHi2B9eQ6zmjGfrRs1KTpD7ZqzLs27Lm7et8"); // official devnet USDC

(async () => {
  const provider = anchor.AnchorProvider.env();
  const program = getProgram(provider);

  const exits = Keypair.generate();
  const prices = Keypair.generate();

  const payer = loadKeypairFromFile(idWallet);

  const [market] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("market"),
      exits.publicKey.toBuffer(),
      prices.publicKey.toBuffer(),
    ],
    program.programId
  );

  const [treasuryA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury_a"), market.toBuffer()],
    program.programId
  );

  const [treasuryB] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury_b"), market.toBuffer()],
    program.programId
  );

  const [bookkeeping] = PublicKey.findProgramAddressSync(
    [Buffer.from("bookkeeping"), market.toBuffer()],
    program.programId
  );

  const createExitsAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: exits.publicKey,
    space: EXITS_ACCOUNT_SIZE,
    lamports:
      await provider.connection.getMinimumBalanceForRentExemption(
        EXITS_ACCOUNT_SIZE
      ),
    programId: program.programId,
  });

  const createPricesAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: prices.publicKey,
    space: PRICES_ACCOUNT_SIZE,
    lamports:
      await provider.connection.getMinimumBalanceForRentExemption(
        PRICES_ACCOUNT_SIZE
      ),
    programId: program.programId,
  });

  let blockhash = await provider.connection.getLatestBlockhash();

  let messageV0 = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash.blockhash,
    instructions: [createExitsAccountIx, createPricesAccountIx],
  }).compileToV0Message();

  const createExitsTx = new VersionedTransaction(messageV0);

  createExitsTx.sign([payer, exits, prices]);
  const createExitsTxId =
    await provider.connection.sendTransaction(createExitsTx);
  console.log(
    `https://explorer.solana.com/tx/${createExitsTxId}?cluster=devnet`
  );
  await provider.connection.confirmTransaction({
    signature: createExitsTxId,
    ...blockhash,
  });

  const accounts: Record<string, PublicKey> = {
    tokenProgram: TOKEN_PROGRAM_ID,
    tokenMintA: SOL_MINT,
    tokenMintB: USDC_MINT,
    market: market,
    treasuryA: treasuryA,
    treasuryB: treasuryB,
    bookkeeping: bookkeeping,
    exits: exits.publicKey,
    prices: prices.publicKey,
  };

  console.log("Exits PubKey", exits.publicKey);
  console.log("Prices PubKey", prices.publicKey);

  let startSlot = await provider.connection.getSlot();

  const initIxs = [
    await program.methods
      .initializeBooks()
      .accountsPartial({ ...accounts })
      .instruction(),

    await program.methods
      .initializeMarket(new BN(startSlot), new BN(10))
      .accountsPartial({ ...accounts })
      .instruction(),

    await program.methods
      .initializeTreasury()
      .accountsPartial({ ...accounts })
      .instruction(),
  ];

  blockhash = await provider.connection.getLatestBlockhash();

  messageV0 = new TransactionMessage({
    payerKey: provider.publicKey,
    recentBlockhash: blockhash.blockhash,
    instructions: initIxs,
  }).compileToV0Message();

  const initBooksTx = new VersionedTransaction(messageV0);
  initBooksTx.sign([payer]);
  let txId = await provider.connection.sendTransaction(initBooksTx);

  console.log(`https://explorer.solana.com/tx/${txId}?cluster=devnet`);
})()
  .then(() => console.log("Market initialized!"))
  .catch((e) => console.log(e));
