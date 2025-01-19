import * as anchor from "@coral-xyz/anchor";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import { getProgram } from "../anchor/src";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { idWallet } from "./helpers";
import { BN } from "@coral-xyz/anchor";

process.env.ANCHOR_PROVIDER_URL = clusterApiUrl("devnet");
// process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET = idWallet;

// Need to first run create mint script and insert the mint addresses here
const exits = new PublicKey("4ChXLnj9r3KBuxxv6C2ii9jsmDWJVKyTCRLysPtykHWY");
const prices = new PublicKey("4y1XPiQex3TD3TqXXN4UMfkGJRiEgJj81JEDZA1aqGxp");

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

  let currentSlot = await provider.connection.getSlot();
  let bookkeepingAccount = await program.account.bookkeeping.fetch(bookkeeping);
  let slot = bookkeepingAccount.lastSlot.add(new BN(500));

  while (slot.toNumber() < currentSlot) {
    console.log(`Current slot: ${currentSlot}`);
    console.log(`Update slot: ${slot.toString()} `);

    // if (currentSlot < slot.toNumber()) {
    //   console.log(
    //     `Slot ${slot.toString()} too far in the future. Current slot: ${currentSlot}`
    //   );
    //   return;
    // }

    await program.methods
      .updateBookkeepingTill(slot)
      .accountsPartial({ ...accounts })
      .rpc({ skipPreflight: true });

    bookkeepingAccount = await program.account.bookkeeping.fetch(bookkeeping);
    slot = bookkeepingAccount.lastSlot.add(new BN(500));
  }
})()
  .then(() => console.log("Books updated!"))
  .catch((e) => console.log(e));
