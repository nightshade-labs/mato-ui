import { useQuery } from '@tanstack/react-query'
import { useSolanaClient } from '@solana/react-hooks'
import { tradingQueries } from '../queries'
import type { Address } from '@solana/kit'

export function useMarketTradePositions(
  marketAddress: Address | undefined,
  enabled = true,
) {
  const client = useSolanaClient()

  return useQuery({
    ...tradingQueries.marketTradePositions({ client, marketAddress }),
    enabled: enabled && Boolean(marketAddress),
    refetchInterval: 5_000,
  })
}
