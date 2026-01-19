import type { MarketUpdateEvent } from '@/integrations/supabase'
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts'

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

export const TIME_INTERVALS: { value: TimeInterval; label: string }[] = [
  { value: '1m', label: '1 min' },
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '4h', label: '4 hours' },
  { value: '1d', label: '1 day' },
]

function getIntervalMs(interval: TimeInterval): number {
  const intervals: Record<TimeInterval, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  }
  return intervals[interval]
}

function calculatePrice(
  baseFlow: bigint,
  quoteFlow: bigint,
  baseDecimals: number,
  quoteDecimals: number,
): number {
  if (baseFlow === 0n) return 0

  const baseAdjusted = Number(baseFlow) / 10 ** baseDecimals
  const quoteAdjusted = Number(quoteFlow) / 10 ** quoteDecimals

  return quoteAdjusted / baseAdjusted
}

function floorToInterval(timestamp: number, intervalMs: number): number {
  return Math.floor(timestamp / intervalMs) * intervalMs
}

export function marketUpdatesToCandles(
  updates: MarketUpdateEvent[],
  interval: TimeInterval,
  baseDecimals: number,
  quoteDecimals: number,
): CandlestickData<UTCTimestamp>[] {
  if (updates.length === 0) return []

  const sortedUpdates = [...updates].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const intervalMs = getIntervalMs(interval)
  const candleMap = new Map<
    number,
    { open: number; high: number; low: number; close: number }
  >()

  for (const update of sortedUpdates) {
    const price = calculatePrice(
      update.base_flow,
      update.quote_flow,
      baseDecimals,
      quoteDecimals,
    )

    if (price === 0) continue

    const timestamp = new Date(update.created_at).getTime()
    const candleTime = floorToInterval(timestamp, intervalMs)

    const existing = candleMap.get(candleTime)
    if (existing) {
      existing.high = Math.max(existing.high, price)
      existing.low = Math.min(existing.low, price)
      existing.close = price
    } else {
      candleMap.set(candleTime, {
        open: price,
        high: price,
        low: price,
        close: price,
      })
    }
  }

  const candles: CandlestickData<UTCTimestamp>[] = []
  const sortedTimes = Array.from(candleMap.keys()).sort((a, b) => a - b)

  let lastClose: number | null = null
  for (const time of sortedTimes) {
    const candle = candleMap.get(time)!

    if (lastClose !== null && candle.open !== lastClose) {
      candle.open = lastClose
    }

    candles.push({
      time: (time / 1000) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })

    lastClose = candle.close
  }

  return candles
}
