import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { MarketUpdateEvent } from '@/integrations/supabase'
import {
  dedupeMarketUpdatesById,
  sortMarketUpdatesDescending,
  subscribeToMarketUpdates,
  unsubscribeFromChannel,
} from '../api/market-repository'
import type { EnsureHistoryOptions } from '../lib/market-history-store'
import {
  hasFullCoverage,
  isValidSlotRange,
  mergeAdjacentRanges,
  subtractCoveredRanges,
  type SlotRange,
} from '../lib/slot-ranges'
import { buildOlderChartHistoryRange } from '../lib/chart-history'
import { tradingQueries } from '../queries'

interface UseMarketUpdatesOptions {
  marketId: number
  limit?: number
}

interface EnsureOlderChartHistoryOptions {
  oldestVisibleSlot: number
  slotsPerBar: number
  visibleBarCount: number
}

function mergeMarketEvents(
  currentEvents: MarketUpdateEvent[],
  incomingEvents: MarketUpdateEvent[],
) {
  return sortMarketUpdatesDescending(
    dedupeMarketUpdatesById([...currentEvents, ...incomingEvents]),
  )
}

function deriveLoadedRange(events: MarketUpdateEvent[]): SlotRange[] {
  if (events.length === 0) return []

  let startSlot = Number.POSITIVE_INFINITY
  let endSlot = Number.NEGATIVE_INFINITY

  for (const event of events) {
    startSlot = Math.min(startSlot, event.slot)
    endSlot = Math.max(endSlot, event.slot)
  }

  if (!Number.isFinite(startSlot) || !Number.isFinite(endSlot)) {
    return []
  }

  return [{ endSlot, startSlot }]
}

function removeCoveredFailedRanges(
  failedRanges: SlotRange[],
  loadedRanges: SlotRange[],
) {
  return failedRanges.filter((range) => !hasFullCoverage(loadedRanges, range))
}

function subtractRangeCollection(
  sourceRanges: SlotRange[],
  removalRanges: SlotRange[],
) {
  const remaining: SlotRange[] = []

  for (const sourceRange of sourceRanges) {
    let nextParts: SlotRange[] = [{ ...sourceRange }]

    for (const removalRange of removalRanges) {
      nextParts = nextParts.flatMap((part) => subtractCoveredRanges(part, [removalRange]))
      if (nextParts.length === 0) {
        break
      }
    }

    remaining.push(...nextParts)
  }

  return mergeAdjacentRanges(remaining, 0)
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
  const [rangeEvents, setRangeEvents] = useState<MarketUpdateEvent[]>([])
  const [rangeLoadedRanges, setRangeLoadedRanges] = useState<SlotRange[]>([])
  const [pendingRanges, setPendingRanges] = useState<SlotRange[]>([])
  const [failedRanges, setFailedRanges] = useState<SlotRange[]>([])
  const loadingMoreHistoryRef = useRef(false)
  const loadedRangesRef = useRef<SlotRange[]>([])
  const pendingRangesRef = useRef<SlotRange[]>([])
  const failedRangesRef = useRef<SlotRange[]>([])

  const query = useQuery(queryOptions)

  useEffect(() => {
    setHistoricalEvents([])
    setLoadingMoreHistory(false)
    setHasMoreHistory(true)
    setHistoryError(null)
    setRangeEvents([])
    setRangeLoadedRanges([])
    setPendingRanges([])
    setFailedRanges([])
    loadingMoreHistoryRef.current = false
  }, [limit, marketId])

  const events = useMemo(() => {
    const latest = query.data ?? []
    return mergeMarketEvents(latest, historicalEvents)
  }, [historicalEvents, query.data])

  const sharedEvents = useMemo(
    () => mergeMarketEvents(events, rangeEvents),
    [events, rangeEvents],
  )

  const chartLoadedRanges = useMemo(() => deriveLoadedRange(events), [events])
  const loadedRanges = useMemo(
    () => mergeAdjacentRanges([...chartLoadedRanges, ...rangeLoadedRanges], 0),
    [chartLoadedRanges, rangeLoadedRanges],
  )

  useEffect(() => {
    loadedRangesRef.current = loadedRanges
  }, [loadedRanges])

  useEffect(() => {
    pendingRangesRef.current = pendingRanges
  }, [pendingRanges])

  useEffect(() => {
    failedRangesRef.current = failedRanges
  }, [failedRanges])

  const ensureOlderChartHistory = useCallback(
    async ({
      oldestVisibleSlot,
      slotsPerBar,
      visibleBarCount,
    }: EnsureOlderChartHistoryOptions) => {
      if (loadingMoreHistoryRef.current || !hasMoreHistory) return
      const oldestLoadedEvent = events[events.length - 1]
      if (!oldestLoadedEvent) return

      const normalizedSlotsPerBar = Math.max(1, Math.floor(slotsPerBar))
      const requestedRange = buildOlderChartHistoryRange({
        oldestLoadedSlot: oldestLoadedEvent.slot,
        oldestVisibleSlot,
        slotsPerBar: normalizedSlotsPerBar,
        visibleBarCount,
      })

      if (requestedRange === null) {
        return
      }

      loadingMoreHistoryRef.current = true
      setLoadingMoreHistory(true)
      setHistoryError(null)

      try {
        const marketHistory = await queryClient.fetchQuery(
          tradingQueries.marketUpdateRange({
            endSlot: requestedRange.endSlot,
            marketId,
            startSlot: requestedRange.startSlot,
          }),
        )

        setHistoricalEvents((previous) => mergeMarketEvents(previous, marketHistory))

        const hasEarlierHistory = marketHistory.some((event) => event.slot < requestedRange.startSlot)
        if (!hasEarlierHistory) {
          setHasMoreHistory(false)
        }
      } catch (error) {
        setHistoryError(error instanceof Error ? error.message : 'Failed to load older chart history')
      } finally {
        setLoadingMoreHistory(false)
        loadingMoreHistoryRef.current = false
      }
    },
    [events, hasMoreHistory, marketId, queryClient],
  )

  const ensureRanges = useCallback(
    async (
      ranges: SlotRange[],
      options: EnsureHistoryOptions = { reason: 'mini-chart' },
    ) => {
      const requestedRanges = mergeAdjacentRanges(
        ranges.filter(isValidSlotRange),
        options.maxGapSlots ?? 0,
      )
      if (requestedRanges.length === 0) {
        return
      }

      const unavailableRanges = mergeAdjacentRanges(
        requestedRanges.flatMap((range) =>
          subtractCoveredRanges(range, [
            ...loadedRangesRef.current,
            ...pendingRangesRef.current,
            ...failedRangesRef.current,
          ]),
        ),
        options.maxGapSlots ?? 0,
      )
      if (unavailableRanges.length === 0) {
        return
      }

      const nextPendingRanges = mergeAdjacentRanges(
        [...pendingRangesRef.current, ...unavailableRanges],
        0,
      )
      pendingRangesRef.current = nextPendingRanges
      setPendingRanges(nextPendingRanges)
      setHistoryError(null)

      const results = await Promise.all(
        unavailableRanges.map(async (range) => {
          try {
            const marketHistory = await queryClient.fetchQuery(
              tradingQueries.marketUpdateRange({
                endSlot: range.endSlot,
                marketId,
                startSlot: range.startSlot,
              }),
            )

            return { error: null, marketHistory, range }
          } catch (error) {
            return { error, marketHistory: [] as MarketUpdateEvent[], range }
          }
        }),
      )

      const nextLoadedRanges: SlotRange[] = []
      const nextFailedRanges: SlotRange[] = []
      const nextEvents: MarketUpdateEvent[] = []
      let nextError: string | null = null

      for (const result of results) {
        if (result.error === null) {
          nextLoadedRanges.push(result.range)
          nextEvents.push(...result.marketHistory)
          continue
        }

        nextFailedRanges.push(result.range)
        const reason = result.error
        nextError =
          reason instanceof Error ? reason.message : 'Failed to load market history range'
      }

      if (nextEvents.length > 0) {
        setRangeEvents((current) => mergeMarketEvents(current, nextEvents))
      }
      if (nextLoadedRanges.length > 0) {
        setRangeLoadedRanges((current) =>
          mergeAdjacentRanges([...current, ...nextLoadedRanges], 0),
        )
      }
      if (nextFailedRanges.length > 0) {
        setFailedRanges((current) => {
          const mergedFailedRanges = mergeAdjacentRanges([...current, ...nextFailedRanges], 0)
          failedRangesRef.current = mergedFailedRanges
          return mergedFailedRanges
        })
      }
      if (nextLoadedRanges.length > 0) {
        const mergedLoadedRanges = mergeAdjacentRanges(
          [...loadedRangesRef.current, ...nextLoadedRanges],
          0,
        )
        loadedRangesRef.current = mergedLoadedRanges
        setFailedRanges((current) => {
          const remainingFailedRanges = removeCoveredFailedRanges(current, mergedLoadedRanges)
          failedRangesRef.current = remainingFailedRanges
          return remainingFailedRanges
        })
      }
      const remainingPendingRanges = subtractRangeCollection(
        pendingRangesRef.current,
        unavailableRanges,
      )
      pendingRangesRef.current = remainingPendingRanges
      setPendingRanges(remainingPendingRanges)
      if (nextError) {
        setHistoryError(nextError)
      }
    },
    [marketId, queryClient],
  )

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
    ensureRanges,
    error: query.error instanceof Error ? query.error.message : historyError,
    failedRanges,
    hasMoreHistory,
    isLoading: query.isPending || query.isFetching,
    loadedRanges,
    ensureOlderChartHistory,
    loadingMoreHistory,
    pendingRanges,
    sharedEvents,
  }
}
