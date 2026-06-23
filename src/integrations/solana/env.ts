const DEFAULT_SOLANA_RPC_ENDPOINT = 'https://api.mainnet.solana.com'

function normalizeEnvValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
}

function readViteEnv(name: string) {
  return normalizeEnvValue(import.meta.env[name])
}

function readProcessEnv(name: string) {
  if (typeof process === 'undefined') return undefined

  return normalizeEnvValue(process.env[name])
}

function firstDefined(
  values: Array<string | undefined>,
  fallback: string,
): string {
  return values.find((value): value is string => value !== undefined) ?? fallback
}

function toWebsocketEndpoint(endpoint: string) {
  return endpoint.replace('https://', 'wss://').replace('http://', 'ws://')
}

export function getBrowserSolanaRpcEndpoint() {
  return firstDefined(
    [readViteEnv('VITE_SOLANA_RPC_URL')],
    DEFAULT_SOLANA_RPC_ENDPOINT,
  )
}

export function getBrowserSolanaWebsocketEndpoint(
  endpoint = getBrowserSolanaRpcEndpoint(),
) {
  return firstDefined(
    [readViteEnv('VITE_SOLANA_WS_URL')],
    toWebsocketEndpoint(endpoint),
  )
}

export function getSolanaRpcEndpoint() {
  return firstDefined(
    [
      readProcessEnv('SOLANA_RPC_URL'),
      readProcessEnv('VITE_SOLANA_RPC_URL'),
      readViteEnv('VITE_SOLANA_RPC_URL'),
    ],
    DEFAULT_SOLANA_RPC_ENDPOINT,
  )
}

export function getSolanaWebsocketEndpoint(endpoint = getSolanaRpcEndpoint()) {
  return firstDefined(
    [
      readProcessEnv('SOLANA_WS_URL'),
      readProcessEnv('VITE_SOLANA_WS_URL'),
      readViteEnv('VITE_SOLANA_WS_URL'),
    ],
    toWebsocketEndpoint(endpoint),
  )
}
