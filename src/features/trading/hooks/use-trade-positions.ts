import { useQuery } from '@tanstack/react-query'
import { useSolanaClient } from '@solana/react-hooks'
import { MARKET_ID } from '../constants'
import { tradingQueries } from '../queries'

export function useTradePositions(authority: string | null | undefined) {
  const client = useSolanaClient()

  return useQuery({
    ...tradingQueries.tradePositions({
      authority,
      client,
      marketId: MARKET_ID,
    }),
    enabled: Boolean(authority),
    refetchInterval: 5_000,
  })
}
