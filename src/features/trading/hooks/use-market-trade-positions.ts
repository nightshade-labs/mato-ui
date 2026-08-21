import { useQuery } from '@tanstack/react-query'
import { useSolanaClient } from '@solana/react-hooks'
import { MARKET_ID } from '../constants'
import { tradingQueries } from '../queries'
import type { Address } from '@solana/kit'

export function useMarketTradePositions(
  marketAddress: Address | undefined,
  enabled = true,
) {
  const client = useSolanaClient()

  return useQuery({
    ...tradingQueries.marketTradePositions({
      client,
      marketAddress,
      marketId: MARKET_ID,
    }),
    enabled: enabled && Boolean(marketAddress),
    refetchInterval: 5_000,
  })
}
