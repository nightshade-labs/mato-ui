import * as anchor from "@coral-xyz/anchor";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import { getProgram } from "../anchor/src";

import {
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { idWallet } from "./helpers";

process.env.ANCHOR_PROVIDER_URL = clusterApiUrl("devnet");
// process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET = idWallet;

// Need to first run create mint script and insert the mint addresses here
const exits = new PublicKey("D467xRNpNHvxbG7nRApDSshnvqVDhL4YjBYqz9TsoKF9");
const prices = new PublicKey("Dpe9rm2NFSTowGbvrwXccbW7FtGfrQCdu6ogugNW6akK");

let solMint = NATIVE_MINT;
let usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

(async () => {
  const provider = anchor.AnchorProvider.env();
  const program = getProgram(provider);

  const allPositionsA = await program.account.positionA.all();
  const allPositionsB = await program.account.positionB.all();

  const [market] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), exits.toBuffer(), prices.toBuffer()],
    program.programId
  );

  const [bookkeeping] = PublicKey.findProgramAddressSync(
    [Buffer.from("bookkeeping"), market.toBuffer()],
    program.programId
  );

  const currentSlot = await provider.connection.getSlot();

  console.log("Current slot:", currentSlot);

  allPositionsA.forEach(async (position) => {
    if (position.account.endSlot.toNumber() < currentSlot) {
      const [positionAPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position_a"),
          market.toBuffer(),
          position.account.owner.toBuffer(),
          position.account.id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      let solATA = getAssociatedTokenAddressSync(
        solMint,
        position.account.owner
      );

      let usdcATA = getAssociatedTokenAddressSync(
        usdcMint,
        position.account.owner
      );

      await program.methods
        .publicClosePositionA()
        .accountsPartial({
          signer: provider.publicKey,
          positionOwner: position.account.owner,
          ownerTokenAccountA: solATA,
          ownerTokenAccountB: usdcATA,
          tokenMintA: solMint,
          tokenMintB: usdcMint,
          market: market,
          positionA: positionAPda,
          bookkeeping: bookkeeping,
          exits: exits,
          prices: prices,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true });
    }
  });

  allPositionsB.forEach(async (position) => {
    if (position.account.endSlot.toNumber() < currentSlot) {
      const [positionBPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position_b"),
          market.toBuffer(),
          position.account.owner.toBuffer(),
          position.account.id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      let solATA = getAssociatedTokenAddressSync(
        solMint,
        position.account.owner
      );

      let usdcATA = getAssociatedTokenAddressSync(
        usdcMint,
        position.account.owner
      );

      await program.methods
        .publicClosePositionB()
        .accountsPartial({
          signer: provider.publicKey,
          positionOwner: position.account.owner,
          ownerTokenAccountA: solATA,
          ownerTokenAccountB: usdcATA,
          tokenMintA: solMint,
          tokenMintB: usdcMint,
          market: market,
          positionB: positionBPda,
          bookkeeping: bookkeeping,
          exits: exits,
          prices: prices,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true });
    }
  });
})()
  .then(() => console.log("Market closed!"))
  .catch((e) => console.log(e));
