import { useQuery } from '@tanstack/react-query'
import { tradingQueries } from '../queries'

export function useMarketConfig(marketId: number) {
  return useQuery(tradingQueries.marketConfig(marketId))
}
