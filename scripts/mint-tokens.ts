import * as anchor from "@coral-xyz/anchor";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";

import { BN } from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { idWallet, loadKeypairFromFile } from "./helpers";

process.env.ANCHOR_PROVIDER_URL = "https://api.testnet.sonic.game";
// process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET = idWallet;

const SOL_MINT = new PublicKey("AWwZdWpkkGWvyvguDHHt9nTkQwd4hokfTJgNKpPMtoZ7");
const USDC_MINT = new PublicKey("GbkB1LkDEHi2B9eQ6zmjGfrRs1KTpD7ZqzLs27Lm7et8");

const destination = new PublicKey(
  "4VfvQ45tZ3FD9eVcJYcQvnb1wGAW8q1wZPAfk3m7VmPY"
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

  // await mintTo(
  //   provider.connection,
  //   payer,
  //   SOL_MINT,
  //   solATA.address,
  //   payer,
  //   20 * 10 ** 9
  // );

  await mintTo(
    provider.connection,
    payer,
    USDC_MINT,
    usdcATA.address,
    payer,
    10_000_000_000 * 10 ** 6
  );
})()
  .then(() => console.log("Tokens minted!"))
  .catch((e) => console.log(e));
