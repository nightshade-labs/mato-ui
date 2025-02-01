import { PublicKey } from "@solana/web3.js";

export const BOOKKEEPING_PRECISION = 1_000_000_000_000_000;
export const VOLUME_PRECISION = 1_000_000_000;

// Mint address
export const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// Program accounts
export const EXITS_ADDRESS = new PublicKey(
  "D467xRNpNHvxbG7nRApDSshnvqVDhL4YjBYqz9TsoKF9"
);
export const PRICES_ADDRESS = new PublicKey(
  "Dpe9rm2NFSTowGbvrwXccbW7FtGfrQCdu6ogugNW6akK"
);
