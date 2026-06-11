import { useQuery } from '@tanstack/react-query'
import { useSolanaClient } from '@solana/react-hooks'
import type { Address } from '@solana/kit'
import { tradingQueries } from '../queries'

export function useStreamingMarketState(marketAddress: Address | undefined) {
  const client = useSolanaClient()

  return useQuery({
    ...tradingQueries.streamingMarket({ client, marketAddress }),
    enabled: marketAddress !== undefined,
  })
}
