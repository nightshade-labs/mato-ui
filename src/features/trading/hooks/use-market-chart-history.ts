import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchMarketCandles } from '../api/market-repository'
import { CHART_TIMEFRAMES } from '../constants'
import { mergeLivePriceIntoCandles } from '../lib/market'
import type { CandleInterval, MarketCandle } from '../api/market-repository'
import type { ChartTimeframe } from '../constants'
import type { MarketPriceSnapshot } from '../domain/models'
import type { OlderChartHistoryRequest } from '../lib/chart-history'
import type { TradingViewAggregatedCandle } from '../lib/market'

interface UseMarketChartHistoryOptions {
  latestPrice?: MarketPriceSnapshot | null
  marketId: number
  timeframe: ChartTimeframe
}

const MIN_INITIAL_CANDLE_COUNT_BY_TIMEFRAME: Partial<
  Record<ChartTimeframe, number>
> = {
  '1h': 48,
}

const DEFAULT_INITIAL_CANDLE_COUNT = 160
const MAX_POINTS = 1500
const MIN_CHUNK_BARS = 120

function mapTimeframeToInterval(timeframe: ChartTimeframe): CandleInterval {
  switch (timeframe) {
    case '5m':
      return '5m'
    case '1h':
      return '1h'
    case '1m':
    default:
      return '1m'
  }
}

function toTradingViewCandle(
  candle: MarketCandle,
): TradingViewAggregatedCandle {
  return {
    averagePrice: candle.averagePrice,
    close: candle.close,
    endSlot: candle.endSlot,
    high: candle.high,
    low: candle.low,
    open: candle.open,
    startSlot: candle.startSlot,
    time: candle.time,
    volume: candle.volume,
  }
}

function mergeCandlesAscending(
  existing: Array<TradingViewAggregatedCandle>,
  incoming: Array<TradingViewAggregatedCandle>,
) {
  const combined = [...incoming, ...existing].sort((left, right) => {
    if (left.time === right.time) {
      return left.endSlot - right.endSlot
    }
    return left.time - right.time
  })

  const deduped: Array<TradingViewAggregatedCandle> = []
  for (const candle of combined) {
    const previous = deduped.at(-1)
    if (previous && previous.time === candle.time) {
      if (candle.endSlot >= previous.endSlot) {
        deduped[deduped.length - 1] = candle
      }
      continue
    }
    deduped.push(candle)
  }

  return deduped
}

export function useMarketChartHistory({
  latestPrice = null,
  marketId,
  timeframe,
}: UseMarketChartHistoryOptions) {
  const [candles, setCandles] = useState<Array<TradingViewAggregatedCandle>>([])
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const oldestLoadedCandleTimeRef = useRef<number | null>(null)
  const candlesRef = useRef<Array<TradingViewAggregatedCandle>>([])
  const requestEpochRef = useRef(0)
  const latestPriceRef = useRef<MarketPriceSnapshot | null>(latestPrice)

  const chartIntervalMs = useMemo(
    () =>
      CHART_TIMEFRAMES.find((option) => option.label === timeframe)
        ?.intervalMs ?? 60 * 60 * 1000,
    [timeframe],
  )
  const interval = useMemo(() => mapTimeframeToInterval(timeframe), [timeframe])

  useEffect(() => {
    candlesRef.current = candles
  }, [candles])

  useEffect(() => {
    latestPriceRef.current = latestPrice

    setCandles((currentCandles) => {
      const mergedCandles = mergeLivePriceIntoCandles({
        candles: currentCandles,
        intervalMs: chartIntervalMs,
        priceSnapshot: latestPrice,
      })

      if (mergedCandles === currentCandles) {
        return currentCandles
      }

      candlesRef.current = mergedCandles
      oldestLoadedCandleTimeRef.current ??= mergedCandles[0]?.time ?? null
      return mergedCandles
    })
  }, [chartIntervalMs, latestPrice])

  useEffect(() => {
    requestEpochRef.current += 1
    const requestEpoch = requestEpochRef.current
    const initialCount =
      MIN_INITIAL_CANDLE_COUNT_BY_TIMEFRAME[timeframe] ??
      DEFAULT_INITIAL_CANDLE_COUNT
    const now = Date.now()
    setCandles([])
    oldestLoadedCandleTimeRef.current = null
    candlesRef.current = []
    setHasMoreHistory(true)
    setIsLoadingMoreHistory(true)
    setError(null)

    let cancelled = false

    const loadInitialCandles = async () => {
      try {
        const nextCandles = await fetchMarketCandles({
          from: new Date(now - initialCount * chartIntervalMs),
          interval,
          marketId,
          maxPoints: MAX_POINTS,
          to: new Date(now + chartIntervalMs),
        })
        if (cancelled || requestEpochRef.current !== requestEpoch) {
          return
        }

        const mapped = nextCandles.map(toTradingViewCandle)
        const liveMerged = mergeLivePriceIntoCandles({
          candles: mapped,
          intervalMs: chartIntervalMs,
          priceSnapshot: latestPriceRef.current,
        })
        setCandles(liveMerged)
        candlesRef.current = liveMerged
        oldestLoadedCandleTimeRef.current = liveMerged[0]?.time ?? null
        setHasMoreHistory(mapped.length > 0)
      } catch (fetchError) {
        if (cancelled || requestEpochRef.current !== requestEpoch) {
          return
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load market candles',
        )
        setHasMoreHistory(false)
      } finally {
        if (!cancelled && requestEpochRef.current === requestEpoch) {
          setIsLoadingMoreHistory(false)
        }
      }
    }

    void loadInitialCandles()

    return () => {
      cancelled = true
    }
  }, [chartIntervalMs, interval, marketId, timeframe])

  const loadOlderHistory = useCallback(
    async ({ visibleBarCount }: OlderChartHistoryRequest) => {
      if (isLoadingMoreHistory || !hasMoreHistory) {
        return
      }

      const existingCandles = candlesRef.current
      if (existingCandles.length === 0) {
        return
      }

      const currentOldestTime =
        oldestLoadedCandleTimeRef.current ?? existingCandles[0].time

      const barsToLoad = Math.min(
        MAX_POINTS,
        Math.max(visibleBarCount, MIN_CHUNK_BARS),
      )
      const requestToMs = currentOldestTime * 1000
      const requestFromMs = Math.max(
        0,
        requestToMs - barsToLoad * chartIntervalMs,
      )

      if (requestToMs <= requestFromMs) {
        setHasMoreHistory(false)
        return
      }

      setIsLoadingMoreHistory(true)
      setError(null)

      const requestEpoch = requestEpochRef.current

      try {
        const olderCandles = await fetchMarketCandles({
          from: new Date(requestFromMs),
          interval,
          marketId,
          maxPoints: MAX_POINTS,
          to: new Date(requestToMs),
        })

        if (requestEpochRef.current !== requestEpoch) {
          return
        }

        const mappedOlderCandles = olderCandles.map(toTradingViewCandle)
        const mergedCandles = mergeCandlesAscending(
          existingCandles,
          mappedOlderCandles,
        )

        setCandles(mergedCandles)
        candlesRef.current = mergedCandles

        const nextOldestTime = mergedCandles[0].time
        oldestLoadedCandleTimeRef.current = nextOldestTime

        const extendedOldestPoint = nextOldestTime < currentOldestTime
        setHasMoreHistory(extendedOldestPoint)
      } catch (fetchError) {
        if (requestEpochRef.current !== requestEpoch) {
          return
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load older market candles',
        )
      } finally {
        if (requestEpochRef.current === requestEpoch) {
          setIsLoadingMoreHistory(false)
        }
      }
    },
    [chartIntervalMs, hasMoreHistory, isLoadingMoreHistory, interval, marketId],
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
    if (candles.length === 0 || error !== null) {
      return
    }

    void loadOlderHistory({
      visibleBarCount: Math.max(candles.length, minimumCandleCount),
    })
  }, [
    candles.length,
    error,
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
