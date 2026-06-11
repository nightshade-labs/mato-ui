import { useQuery } from '@tanstack/react-query'
import { tradingQueries } from '../queries'

export function useMarketAddress(marketId: number) {
  return useQuery(tradingQueries.marketAddress(marketId))
}
