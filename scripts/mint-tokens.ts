import * as anchor from "@coral-xyz/anchor";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";

import { BN } from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { idWallet, loadKeypairFromFile } from "./helpers";

process.env.ANCHOR_PROVIDER_URL = clusterApiUrl("devnet");
// process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET = idWallet;

const SOL_MINT = new PublicKey("ApyFDKqwHGcghiFVQLJ5z6XUcTBjVtasjxjnF22Pvpzm");
const USDC_MINT = new PublicKey("2oC4Uu9mQn1KU8FYfL8d5ECi4u2ESQKbb3xTb4wmtJnq");

const destination = new PublicKey(
  "6godj8NEn7ETyjsNvG629eSiEDbBamcd2E7tSjVNneyY"
);

(async () => {
  const provider = anchor.AnchorProvider.env();

  const payer = loadKeypairFromFile(idWallet);

  let solATA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    SOL_MINT,
    destination
  );

  let usdcATA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    USDC_MINT,
    destination
  );

  await mintTo(
    provider.connection,
    payer,
    SOL_MINT,
    solATA.address,
    payer,
    20 * 10 ** 9
  );

  await mintTo(
    provider.connection,
    payer,
    USDC_MINT,
    usdcATA.address,
    payer,
    10_000 * 10 ** 6
  );
})()
  .then(() => console.log("Tokens minted!"))
  .catch((e) => console.log(e));
