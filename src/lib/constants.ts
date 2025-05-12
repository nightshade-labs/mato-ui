import { PublicKey } from "@solana/web3.js";

export const BOOKKEEPING_PRECISION = 1_000_000_000_000_000;
export const VOLUME_PRECISION = 1_000_000_000;

// Mint address
export const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// Program accounts
export const EXITS_ADDRESS = new PublicKey(
  "7fn18qWcZHXLGuwcb9vGJwLs6Vf6f3nZHBmjgNiJJPe1"
);
export const PRICES_ADDRESS = new PublicKey(
  "BDRwP7699RGQ7Kj7gowNdh2wuscrcMjZLkaqh7x7tDSx"
);
