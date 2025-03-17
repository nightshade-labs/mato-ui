// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import MatoIDL from "../target/idl/mato.json";
import type { Mato } from "../target/types/mato";

// Re-export the generated IDL and type
export { Mato, MatoIDL };

// The programId is imported from the program IDL.
export const MATO_PROGRAM_ID = new PublicKey(MatoIDL.address);

// This is a helper function to get the Basic Anchor program.
export function getProgram(provider: AnchorProvider) {
  return new Program(MatoIDL as Mato, provider);
}
