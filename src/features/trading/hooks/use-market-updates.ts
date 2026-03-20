import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { MarketUpdateEvent } from '@/integrations/supabase'
import {
  dedupeMarketUpdatesById,
  fetchMarketUpdatesPage,
  sortMarketUpdatesDescending,
  subscribeToMarketUpdates,
  unsubscribeFromChannel,
} from '../api/market-repository'
import { tradingQueries } from '../queries'

interface UseMarketUpdatesOptions {
  marketId: number
  limit?: number
}

export function useMarketUpdates({ marketId, limit = 200 }: UseMarketUpdatesOptions) {
  const queryClient = useQueryClient()
  const queryOptions = useMemo(
    () => tradingQueries.marketUpdates({ limit, marketId }),
    [limit, marketId],
  )
  const queryKey = queryOptions.queryKey
  const [historicalEvents, setHistoricalEvents] = useState<MarketUpdateEvent[]>([])
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const loadingMoreHistoryRef = useRef(false)

  const query = useQuery(queryOptions)

  useEffect(() => {
    setHistoricalEvents([])
    setLoadingMoreHistory(false)
    setHasMoreHistory(true)
    setHistoryError(null)
    loadingMoreHistoryRef.current = false
  }, [limit, marketId])

  const events = useMemo(() => {
    const latest = query.data ?? []
    return sortMarketUpdatesDescending(
      dedupeMarketUpdatesById([...latest, ...historicalEvents]),
    )
  }, [historicalEvents, query.data])

  const loadMoreHistory = useCallback(async () => {
    if (loadingMoreHistoryRef.current || !hasMoreHistory) return
    const oldestEvent = events[events.length - 1]
    if (!oldestEvent) return

    loadingMoreHistoryRef.current = true
    setLoadingMoreHistory(true)
    setHistoryError(null)

    try {
      const nextPage = await fetchMarketUpdatesPage({
        beforeSlot: oldestEvent.slot,
        limit,
        marketId,
      })
      setHistoricalEvents((previous) =>
        sortMarketUpdatesDescending(
          dedupeMarketUpdatesById([...previous, ...nextPage]),
        ),
      )
      if (nextPage.length < limit) {
        setHasMoreHistory(false)
      }
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Failed to load more market history')
    } finally {
      setLoadingMoreHistory(false)
      loadingMoreHistoryRef.current = false
    }
  }, [events, hasMoreHistory, limit, marketId])

  useEffect(() => {
    const channel = subscribeToMarketUpdates({
      channelName: `market_updates_${marketId}`,
      marketId,
      onInsert: (event) => {
        queryClient.setQueryData<MarketUpdateEvent[]>(queryKey, (previous) => {
          const current = previous ?? []
          return sortMarketUpdatesDescending(
            dedupeMarketUpdatesById([event, ...current]),
          ).slice(0, limit)
        })
      },
    })

    return () => {
      void unsubscribeFromChannel(channel)
    }
  }, [limit, marketId, queryClient, queryKey])

  return {
    events,
    error: query.error instanceof Error ? query.error.message : historyError,
    hasMoreHistory,
    isLoading: query.isPending || query.isFetching,
    loadMoreHistory,
    loadingMoreHistory,
  }
}
