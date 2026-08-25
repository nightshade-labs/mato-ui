import { createSolanaRpcSubscriptions } from '@solana/kit'
import { getSolanaRpcEndpoint, getSolanaWebsocketEndpoint } from './env'
import { createSolanaRpcWithRateLimitRetry } from './rpc'

const endpoint = getSolanaRpcEndpoint()
const websocketEndpoint = getSolanaWebsocketEndpoint(endpoint)

export const rpc = createSolanaRpcWithRateLimitRetry(endpoint)
export const rpcSubscriptions = createSolanaRpcSubscriptions(websocketEndpoint)

export { endpoint, websocketEndpoint }
