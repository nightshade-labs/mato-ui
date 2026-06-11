import { useQuery } from '@tanstack/react-query'
import { useSolanaClient } from '@solana/react-hooks'
import { tradingQueries } from '../queries'

export function useTradePositions(authority: string | null | undefined) {
  const client = useSolanaClient()

  return useQuery({
    ...tradingQueries.tradePositions({ authority, client }),
    enabled: Boolean(authority),
    refetchInterval: 5_000,
  })
}
