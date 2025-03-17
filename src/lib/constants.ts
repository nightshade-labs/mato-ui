import { PublicKey } from "@solana/web3.js";

export const BOOKKEEPING_PRECISION = 1_000_000_000_000_000;
export const VOLUME_PRECISION = 1_000_000_000;

// Mint address
export const USDC_MINT = new PublicKey(
  "GbkB1LkDEHi2B9eQ6zmjGfrRs1KTpD7ZqzLs27Lm7et8"
);

// Program accounts
export const EXITS_ADDRESS = new PublicKey(
  "ASgjENhoPdnC5U5cf5oNrzP6HsBXz2wyNpjW2HSe43Uh"
);
export const PRICES_ADDRESS = new PublicKey(
  "F5UWZGomBEEGFfs44TTyNR2Xi2WLrue8TPoRzMvmWZup"
);
