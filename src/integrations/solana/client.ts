import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'

const endpoint =
  (typeof process !== 'undefined' && process.env?.VITE_SOLANA_RPC_URL) ||
  'https://api.devnet.solana.com'

const websocketEndpoint =
  (typeof process !== 'undefined' && process.env?.VITE_SOLANA_WS_URL) ||
  endpoint.replace('https://', 'wss://').replace('http://', 'ws://')

export const rpc = createSolanaRpc(endpoint)
export const rpcSubscriptions = createSolanaRpcSubscriptions(websocketEndpoint)

export { endpoint, websocketEndpoint }
