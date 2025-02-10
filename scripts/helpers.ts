import { Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";

const DEFAULT_KEY_DIR_NAME = ".local_keys";
const DEFAULT_PUBLIC_KEY_FILE = "keys.json";

export const idWallet = os.homedir() + "/.config/solana/id.json";

export function loadKeypairFromFile(absPath: string) {
  try {
    if (!absPath) throw Error("No path provided");
    if (!fs.existsSync(absPath)) throw Error("File does not exist.");

    const keyfileBytes = JSON.parse(
      fs.readFileSync(absPath, { encoding: "utf-8" })
    );
    const keypair = Keypair.fromSecretKey(new Uint8Array(keyfileBytes));
    return keypair;
  } catch (err) {
    throw err;
  }
}

export function loadPublicKeysFromFile(
  absPath: string = `${DEFAULT_KEY_DIR_NAME}/${DEFAULT_PUBLIC_KEY_FILE}`
) {
  try {
    if (!absPath) throw Error("No path provided");
    if (!fs.existsSync(absPath)) throw Error("File does not exist.");

    const data =
      JSON.parse(fs.readFileSync(absPath, { encoding: "utf-8" })) || {};

    // convert all loaded keyed values into valid public keys
    for (const [key, value] of Object.entries(data)) {
      data[key] = new PublicKey(value as string) ?? "";
    }

    return data;
  } catch (err) {
    console.warn("Unable to load local file");
  }

  return {};
}

export function savePublicKeyToFile(
  name: string,
  publicKey: PublicKey,
  absPath: string = `${DEFAULT_KEY_DIR_NAME}/${DEFAULT_PUBLIC_KEY_FILE}`
) {
  try {
    let data: any = loadPublicKeysFromFile(absPath);

    // convert all loaded keyed values from PublicKeys to strings
    for (const [key, value] of Object.entries(data)) {
      data[key as any] = (value as PublicKey).toBase58();
    }
    data = { ...data, [name]: publicKey.toBase58() };

    // actually save the data to the file
    fs.writeFileSync(absPath, JSON.stringify(data), {
      encoding: "utf-8",
    });

    // reload the keys for sanity
    data = loadPublicKeysFromFile(absPath);

    return data;
  } catch (err) {
    console.warn("Unable to save to file");
  }
  return {};
}
