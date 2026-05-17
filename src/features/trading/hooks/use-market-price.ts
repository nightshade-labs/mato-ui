import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { subscribeToMarketPriceStream } from '../api/market-repository'
import { tradingQueries } from '../queries'

export function useMarketPrice(marketId: number) {
  const queryClient = useQueryClient()
  const queryKey = tradingQueries.marketPrice(marketId).queryKey

  const query = useQuery(tradingQueries.marketPrice(marketId))

  useEffect(() => {
    const stream = subscribeToMarketPriceStream({
      marketId,
      onPriceUpdate: (priceSnapshot) => {
        queryClient.setQueryData(queryKey, priceSnapshot)
      },
    })

    return () => {
      stream.close()
    }
  }, [marketId, queryClient, queryKey])

  return query
}
