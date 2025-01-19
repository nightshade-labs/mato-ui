import * as anchor from "@coral-xyz/anchor";
import { getExplorerLink } from "@solana-developers/helpers";

import {
  createFungible,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createSignerFromKeypair,
  generateSigner,
  percentAmount,
  signerIdentity,
  some,
  Umi,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { idWallet, loadKeypairFromFile, savePublicKeyToFile } from "./helpers";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";

export function createMint(umi: Umi) {
  console.log("Create token...");

  const secret = loadKeypairFromFile(idWallet);

  let keypair = umi.eddsa.createKeypairFromSecretKey(secret.secretKey);
  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(signer));

  const mint = generateSigner(umi);
  const link = getExplorerLink("address", mint.publicKey.toString(), "devnet");
  console.log(`✅ Success! Created token mint: ${link}`);

  return mint;
}

(async () => {
  const umi = createUmi(clusterApiUrl("devnet")).use(mplTokenMetadata());

  const usdcMint = createMint(umi);
  const solMint = createMint(umi);

  await createFungible(umi, {
    mint: usdcMint,
    name: "Mato USDC",
    symbol: "matoUSDC",
    updateAuthority: umi.payer,
    uri: "https://cdn.jsdelivr.net/gh/nightshade-labs/mato-ui/scripts/tokenConfig/tUSDC.json",
    sellerFeeBasisPoints: percentAmount(0),
    decimals: some(6),
  }).sendAndConfirm(umi);

  await createFungible(umi, {
    mint: solMint,
    name: "Mato SOL",
    symbol: "matoSOL",
    updateAuthority: umi.payer,
    uri: "https://cdn.jsdelivr.net/gh/nightshade-labs/mato-ui/scripts/tokenConfig/tSOL.json",
    sellerFeeBasisPoints: percentAmount(0),
    decimals: some(9),
  }).sendAndConfirm(umi);

  // savePublicKeyToFile("tokenMint", new PublicKey(usdcMint.publicKey));

  const tokenSolMintLink = getExplorerLink(
    "address",
    solMint.publicKey.toString(),
    "devnet"
  );
  console.log(`✅ Look at the token mint again: ${tokenSolMintLink}!`);

  const tokenUsdcMintLink = getExplorerLink(
    "address",
    usdcMint.publicKey.toString(),
    "devnet"
  );
  console.log(`✅ Look at the token mint again: ${tokenUsdcMintLink}!`);

  console.log(`USDC Mint: ${usdcMint}!`);
  console.log(`SOL Mint: ${solMint}!`);
})()
  .then(() => console.log("Token minted!"))
  .catch((e) => console.log(e));
