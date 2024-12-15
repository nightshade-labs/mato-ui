import * as anchor from "@coral-xyz/anchor";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";

import { BN } from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { idWallet, loadKeypairFromFile } from "./helpers";

process.env.ANCHOR_PROVIDER_URL = clusterApiUrl("devnet");
// process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET = idWallet;

const SOL_MINT = new PublicKey("3gBEWKo5LzJchbYHPNj7RvpWgnVB82NRxTDwufb3LLpG");
const USDC_MINT = new PublicKey("eZPu9HgerixxXzetscuTzY5wFMjxDMMMtcNftzeRPr3");

const destination = new PublicKey(
  "9aav53TmWKruhV3XTk1Ld83jg6ju2zzMPZrUc4jZ8LG5",
);

(async () => {
  const provider = anchor.AnchorProvider.env();

  const payer = loadKeypairFromFile(idWallet);

  let solATA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    SOL_MINT,
    destination,
  );

  let usdcATA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    USDC_MINT,
    destination,
  );

  await mintTo(
    provider.connection,
    payer,
    SOL_MINT,
    solATA.address,
    payer,
    10 * 10 ** 9,
  );

  await mintTo(
    provider.connection,
    payer,
    USDC_MINT,
    usdcATA.address,
    payer,
    2_000 * 10 ** 6,
  );
})()
  .then(() => console.log("Tokens minted!"))
  .catch((e) => console.log(e));
