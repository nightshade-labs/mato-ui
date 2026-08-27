import { pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

const PUBLIC_SOLANA_RPC_HOSTS = new Set([
  'api.mainnet.solana.com',
  'api.mainnet-beta.solana.com',
])

function parseEndpoint(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(
      `${name} is required in .env.production.local before deploying`,
    )
  }

  if (/YOUR_|REPLACE/i.test(value)) {
    throw new Error(`${name} still contains a placeholder value`)
  }

  try {
    return new URL(value)
  } catch {
    throw new Error(`${name} must be a valid URL`)
  }
}

function assertMainnetEndpoint(endpoint: URL, name: string) {
  if (!endpoint.hostname.toLowerCase().includes('mainnet')) {
    throw new Error(`${name} must point to a mainnet endpoint`)
  }
}

export function validateProductionSolanaEndpoints(
  rpcEndpoint: string | undefined,
  websocketEndpoint: string | undefined,
) {
  const rpcUrl = parseEndpoint(rpcEndpoint, 'VITE_SOLANA_RPC_URL')
  const websocketUrl = parseEndpoint(websocketEndpoint, 'VITE_SOLANA_WS_URL')

  if (rpcUrl.protocol !== 'https:') {
    throw new Error('VITE_SOLANA_RPC_URL must use HTTPS')
  }

  if (websocketUrl.protocol !== 'wss:') {
    throw new Error('VITE_SOLANA_WS_URL must use WSS')
  }

  assertMainnetEndpoint(rpcUrl, 'VITE_SOLANA_RPC_URL')
  assertMainnetEndpoint(websocketUrl, 'VITE_SOLANA_WS_URL')

  if (PUBLIC_SOLANA_RPC_HOSTS.has(rpcUrl.hostname.toLowerCase())) {
    throw new Error(
      'VITE_SOLANA_RPC_URL must use a dedicated provider endpoint for production',
    )
  }

  return { rpcUrl, websocketUrl }
}

function main() {
  const env = loadEnv('production', process.cwd(), 'VITE_SOLANA_')
  const { rpcUrl, websocketUrl } = validateProductionSolanaEndpoints(
    env.VITE_SOLANA_RPC_URL,
    env.VITE_SOLANA_WS_URL,
  )

  console.log(
    `Production Solana endpoints verified: ${rpcUrl.hostname}, ${websocketUrl.hostname}`,
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
