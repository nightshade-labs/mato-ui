import * as anchor from "@coral-xyz/anchor";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import { getProgram } from "../anchor/src";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { idWallet } from "./helpers";

process.env.ANCHOR_PROVIDER_URL = clusterApiUrl("devnet");
// process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET = idWallet;

// Need to first run create mint script and insert the mint addresses here
const exits = new PublicKey("7fn18qWcZHXLGuwcb9vGJwLs6Vf6f3nZHBmjgNiJJPe1");
const prices = new PublicKey("BDRwP7699RGQ7Kj7gowNdh2wuscrcMjZLkaqh7x7tDSx");

(async () => {
  const provider = anchor.AnchorProvider.env();
  const program = getProgram(provider);

  const [market] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), exits.toBuffer(), prices.toBuffer()],
    program.programId
  );

  const [bookkeeping] = PublicKey.findProgramAddressSync(
    [Buffer.from("bookkeeping"), market.toBuffer()],
    program.programId
  );

  const accounts: Record<string, PublicKey> = {
    tokenProgram: TOKEN_PROGRAM_ID,
    market: market,
    bookkeeping: bookkeeping,
    exits: exits,
    prices: prices,
  };

  while (true) {
    await program.methods
      .updateBookkeeping()
      .accountsPartial({ ...accounts })
      .rpc({ skipPreflight: true });

    console.log("Books updated");
    await new Promise((f) => setTimeout(f, 20 * 60 * 1000));
  }
})()
  .then(() => console.log("Market initialized!"))
  .catch((e) => console.log(e));
