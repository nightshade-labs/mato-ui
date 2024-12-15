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
import { createMint, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { idWallet, loadKeypairFromFile } from "./helpers";

// process.env.ANCHOR_PROVIDER_URL = clusterApiUrl("devnet");
process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET = idWallet;

(async () => {
  const provider = anchor.AnchorProvider.env();

  const payer = loadKeypairFromFile(idWallet);

  const mintKeypairUSDC = Keypair.generate();
  const mintKeypairSOL = Keypair.generate();

  const tokenConfigUSDC = {
    decimals: 6,
    name: "USDC",
    symbol: "tUSDC",
    uri: "https://thisisnot.arealurl/info.json",
  };

  const tokenConfigSOL = {
    decimals: 9,
    name: "SOL",
    symbol: "tSOL",
    uri: "https://thisisnot.arealurl/info.json",
  };

  const mintUSDC = await createMint(
    provider.connection,
    payer,
    // mint authority
    payer.publicKey,
    // freeze authority
    payer.publicKey,
    // decimals - use any number you desire
    tokenConfigUSDC.decimals,
    // manually define our token mint address
    mintKeypairUSDC,
  );

  const mintSOL = await createMint(
    provider.connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    tokenConfigSOL.decimals,
    mintKeypairSOL,
  );

  console.log("SOL's mint address:", mintSOL.toBase58());
  console.log("USDC's mint address:", mintUSDC.toBase58());
})()
  .then(() => console.log("Token mints created!"))
  .catch((e) => console.log(e));
