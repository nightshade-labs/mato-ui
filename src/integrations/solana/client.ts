import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'
import { getSolanaRpcEndpoint, getSolanaWebsocketEndpoint } from './env'

const endpoint = getSolanaRpcEndpoint()
const websocketEndpoint = getSolanaWebsocketEndpoint(endpoint)

export const rpc = createSolanaRpc(endpoint)
export const rpcSubscriptions = createSolanaRpcSubscriptions(websocketEndpoint)

export { endpoint, websocketEndpoint }
