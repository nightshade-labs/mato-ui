import { SolanaProvider as BaseSolanaProvider } from '@solana/react-hooks'
import { autoDiscover, createClient } from '@solana/client'

const endpoint =
  (typeof window !== 'undefined' && import.meta.env.VITE_SOLANA_RPC_URL) ||
  'https://api.devnet.solana.com'

const websocketEndpoint =
  (typeof window !== 'undefined' && import.meta.env.VITE_SOLANA_WS_URL) ||
  endpoint.replace('https://', 'wss://').replace('http://', 'ws://')

export const solanaClient = createClient({
  endpoint,
  websocketEndpoint,
  walletConnectors: autoDiscover(),
})

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseSolanaProvider client={solanaClient}>{children}</BaseSolanaProvider>
  )
}
