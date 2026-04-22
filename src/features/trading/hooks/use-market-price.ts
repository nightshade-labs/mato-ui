import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  subscribeToMarketUpdates,
  unsubscribeFromChannel,
} from '../api/market-repository'
import { marketPriceFromFlows } from '../lib/market'
import { tradingQueries } from '../queries'
import { useMarketConfig } from './use-market-config'

export function useMarketPrice(marketId: number) {
  const queryClient = useQueryClient()
  const marketConfigQuery = useMarketConfig(marketId)
  const config = marketConfigQuery.data
  const queryKey = tradingQueries.marketPrice(marketId).queryKey

  const query = useQuery({
    ...tradingQueries.marketPrice(marketId, config),
    enabled: config !== undefined,
  })

  useEffect(() => {
    if (!config) return

    const channel = subscribeToMarketUpdates({
      channelName: `market_price_${marketId}`,
      marketId,
      onInsert: (event) => {
        const price = marketPriceFromFlows(
          event.base_flow,
          event.quote_flow,
          config.base_decimals,
          config.quote_decimals,
        )
        queryClient.setQueryData(queryKey, { price, slot: event.slot })
      },
    })

    return () => {
      void unsubscribeFromChannel(channel)
    }
  }, [config, marketId, queryClient, queryKey])

  return query
}
