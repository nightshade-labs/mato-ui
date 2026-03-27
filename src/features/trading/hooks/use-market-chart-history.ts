import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  dedupeMarketUpdatesById,
  sortMarketUpdatesDescending,
} from '../api/market-repository'
import { CHART_TIMEFRAMES, SLOT_DURATION_MS } from '../constants'
import { buildOlderChartHistoryRange } from '../lib/chart-history'
import { aggregateTradingViewCandles } from '../lib/market'
import { tradingQueries } from '../queries'
import type { OlderChartHistoryRequest } from '../lib/chart-history'
import type { ChartTimeframe } from '../constants'
import type { MarketTimeAnchor } from '../lib/market'
import type { MarketUpdateEvent } from '@/integrations/supabase'

interface UseMarketChartHistoryOptions {
  baseDecimals: number
  latestEvents: Array<MarketUpdateEvent>
  marketId: number
  quoteDecimals: number
  timeframe: ChartTimeframe
}

const MIN_INITIAL_CANDLE_COUNT_BY_TIMEFRAME: Partial<
  Record<ChartTimeframe, number>
> = {
  '1h': 48,
}

function mergeMarketEvents(
  currentEvents: Array<MarketUpdateEvent>,
  incomingEvents: Array<MarketUpdateEvent>,
) {
  return sortMarketUpdatesDescending(
    dedupeMarketUpdatesById([...currentEvents, ...incomingEvents]),
  )
}

export function useMarketChartHistory({
  baseDecimals,
  latestEvents,
  marketId,
  quoteDecimals,
  timeframe,
}: UseMarketChartHistoryOptions) {
  const queryClient = useQueryClient()
  const [historicalEvents, setHistoricalEvents] = useState<
    Array<MarketUpdateEvent>
  >([])
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeAnchor, setTimeAnchor] = useState<MarketTimeAnchor | null>(null)

  useEffect(() => {
    setHistoricalEvents([])
    setHasMoreHistory(true)
    setIsLoadingMoreHistory(false)
    setError(null)
    setTimeAnchor(null)
  }, [marketId])

  useEffect(() => {
    if (timeAnchor !== null) {
      return
    }

    const newestEvent = latestEvents.at(0)
    if (!newestEvent) {
      return
    }

    const timeMs = new Date(newestEvent.created_at).getTime()
    if (!Number.isFinite(timeMs)) {
      return
    }

    setTimeAnchor({
      slot: newestEvent.slot,
      timeMs,
    })
  }, [latestEvents, timeAnchor])

  const chartIntervalMs = useMemo(
    () =>
      CHART_TIMEFRAMES.find((option) => option.label === timeframe)
        ?.intervalMs ?? 60 * 60 * 1000,
    [timeframe],
  )
  const events = useMemo(
    () => mergeMarketEvents(latestEvents, historicalEvents),
    [historicalEvents, latestEvents],
  )
  const candles = useMemo(
    () =>
      aggregateTradingViewCandles(
        events,
        chartIntervalMs,
        baseDecimals,
        quoteDecimals,
        SLOT_DURATION_MS,
        timeAnchor ?? undefined,
      ),
    [baseDecimals, chartIntervalMs, events, quoteDecimals, timeAnchor],
  )

  const loadOlderHistory = useCallback(
    async ({ visibleBarCount }: OlderChartHistoryRequest) => {
      if (isLoadingMoreHistory || !hasMoreHistory) {
        return
      }

      const oldestLoadedEvent = events.at(-1)
      if (!oldestLoadedEvent) {
        return
      }

      const requestedRange = buildOlderChartHistoryRange({
        oldestLoadedSlot: oldestLoadedEvent.slot,
        slotsPerBar: Math.max(
          1,
          Math.round(chartIntervalMs / SLOT_DURATION_MS),
        ),
        visibleBarCount,
      })

      if (requestedRange === null) {
        setHasMoreHistory(false)
        return
      }

      setIsLoadingMoreHistory(true)
      setError(null)

      try {
        const marketHistory = await queryClient.fetchQuery(
          tradingQueries.marketUpdateRange({
            endSlot: requestedRange.endSlot,
            marketId,
            startSlot: requestedRange.startSlot,
          }),
        )

        setHistoricalEvents((previous) =>
          mergeMarketEvents(previous, marketHistory),
        )

        const hasEarlierHistory = marketHistory.some(
          (event) => event.slot < requestedRange.startSlot,
        )
        if (!hasEarlierHistory) {
          setHasMoreHistory(false)
        }
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load older chart history',
        )
      } finally {
        setIsLoadingMoreHistory(false)
      }
    },
    [
      chartIntervalMs,
      events,
      hasMoreHistory,
      isLoadingMoreHistory,
      marketId,
      queryClient,
    ],
  )

  useEffect(() => {
    const minimumCandleCount =
      MIN_INITIAL_CANDLE_COUNT_BY_TIMEFRAME[timeframe] ?? 0

    if (minimumCandleCount <= 0) {
      return
    }
    if (candles.length >= minimumCandleCount) {
      return
    }
    if (isLoadingMoreHistory || !hasMoreHistory) {
      return
    }
    if (candles.length === 0) {
      return
    }

    void loadOlderHistory({
      visibleBarCount: Math.max(candles.length, minimumCandleCount),
    })
  }, [
    candles.length,
    hasMoreHistory,
    isLoadingMoreHistory,
    loadOlderHistory,
    timeframe,
  ])

  return {
    candles,
    chartIntervalMs,
    error,
    hasMoreHistory,
    isLoadingMoreHistory,
    loadOlderHistory,
  }
}
