import { useQuery } from '@tanstack/react-query'
import { tradingQueries } from '../queries'

export function useMarketPriceChange24h(marketId: number) {
  return useQuery(tradingQueries.marketPriceChange24h(marketId))
}
