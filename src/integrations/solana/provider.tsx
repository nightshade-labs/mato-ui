import { useEffect, useRef, useState } from 'react'
import { SolanaProvider as BaseSolanaProvider } from '@solana/react-hooks'
import {
  createClient,
  getWalletStandardConnectors,
  watchWalletStandardConnectors,
} from '@solana/client'
import type { SolanaClient, WalletConnector } from '@solana/client'

const endpoint =
  (typeof window !== 'undefined' && import.meta.env.VITE_SOLANA_RPC_URL) ||
  'https://api.mainnet.solana.com'

const websocketEndpoint =
  (typeof window !== 'undefined' && import.meta.env.VITE_SOLANA_WS_URL) ||
  endpoint.replace('https://', 'wss://').replace('http://', 'ws://')

function getInitialWalletConnectors() {
  if (typeof window === 'undefined') return []

  return getWalletStandardConnectors()
}

function haveSameConnectors(
  previous: ReadonlyArray<WalletConnector>,
  next: ReadonlyArray<WalletConnector>,
) {
  return (
    previous.length === next.length &&
    previous.every(
      (connector, index) =>
        connector.id === next[index]?.id &&
        connector.name === next[index]?.name,
    )
  )
}

function createSolanaClient(
  walletConnectors: ReadonlyArray<WalletConnector>,
  previousClient?: SolanaClient,
) {
  const client = createClient({
    endpoint,
    websocketEndpoint,
    walletConnectors,
  })

  const previousWallet = previousClient?.store.getState().wallet
  if (previousWallet && previousWallet.status !== 'disconnected') {
    client.store.setState((state) => ({
      ...state,
      lastUpdatedAt: Date.now(),
      wallet: previousWallet,
    }))
  }

  return client
}

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState(() =>
    createSolanaClient(getInitialWalletConnectors()),
  )
  const clientRef = useRef(client)

  useEffect(() => {
    clientRef.current = client
  }, [client])

  useEffect(() => {
    const unwatch = watchWalletStandardConnectors((walletConnectors) => {
      setClient((previousClient) => {
        if (
          haveSameConnectors(previousClient.connectors.all, walletConnectors)
        ) {
          return previousClient
        }

        const nextClient = createSolanaClient(walletConnectors, previousClient)
        previousClient.destroy()
        return nextClient
      })
    })

    return () => {
      unwatch()
      clientRef.current.destroy()
    }
  }, [])

  return <BaseSolanaProvider client={client}>{children}</BaseSolanaProvider>
}
