import type { MarketUpdateEvent } from '@/integrations/supabase'

export interface TradingViewAggregatedCandle {
  endSlot: number
  time: number
  startSlot: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface SlotPricePoint {
  slot: number
  createdAtMs: number
  price: number
  quoteVolume: number
}

interface SlotBucketCandle {
  bucketEndSlot: number
  bucketStartSlot: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface NormalizedCandle {
  endSlot: number
  timestampMs: number
  startSlot: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function marketPriceFromFlows(
  baseFlow: bigint,
  quoteFlow: bigint,
  baseDecimals: number,
  quoteDecimals: number,
) {
  if (baseFlow === 0n) return null
  const base = Number(baseFlow) / 10 ** baseDecimals
  if (!Number.isFinite(base) || base === 0) return null
  const quote = Number(quoteFlow) / 10 ** quoteDecimals
  const price = Math.abs(quote) / Math.abs(base)
  if (!Number.isFinite(price) || price <= 0) return null
  return price
}

function normalizePoints(
  events: MarketUpdateEvent[],
  baseScale: number,
  quoteScale: number,
): SlotPricePoint[] {
  const latestPerSlot = new Map<number, SlotPricePoint>()

  for (const event of events) {
    if (event.base_flow === 0n) continue
    const base = Number(event.base_flow) / baseScale
    const quote = Number(event.quote_flow) / quoteScale
    if (!Number.isFinite(base) || !Number.isFinite(quote) || base === 0) continue
    const price = Math.abs(quote) / Math.abs(base)
    const quoteVolume = Math.abs(Number(event.quote_flow) / quoteScale)
    const createdAtMs = new Date(event.created_at).getTime()
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(createdAtMs)) continue

    const previous = latestPerSlot.get(event.slot)
    if (!previous || createdAtMs >= previous.createdAtMs) {
      latestPerSlot.set(event.slot, {
        slot: event.slot,
        createdAtMs,
        price,
        quoteVolume,
      })
    }
  }

  return Array.from(latestPerSlot.values()).sort((left, right) => left.slot - right.slot)
}

function aggregateSparseSlotCandles(
  events: MarketUpdateEvent[],
  intervalMs: number,
  baseDecimals: number,
  quoteDecimals: number,
  slotDurationMs: number,
): NormalizedCandle[] {
  if (intervalMs <= 0 || slotDurationMs <= 0) return []

  const baseScale = 10 ** baseDecimals
  const quoteScale = 10 ** quoteDecimals
  const points = normalizePoints(events, baseScale, quoteScale)
  if (points.length === 0) return []

  const bucketSizeSlots = Math.max(1, Math.round(intervalMs / slotDurationMs))
  const latestPoint = points[points.length - 1]
  const anchorMs = latestPoint.createdAtMs - latestPoint.slot * slotDurationMs
  const buckets = new Map<number, SlotBucketCandle>()

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    const nextPoint = points[index + 1]
    const segmentStart = point.slot
    const segmentEnd = Math.max(point.slot + 1, nextPoint ? nextPoint.slot : point.slot + 1)
    let bucketStart = Math.floor(segmentStart / bucketSizeSlots) * bucketSizeSlots

    while (bucketStart < segmentEnd) {
      const bucketEnd = bucketStart + bucketSizeSlots
      const overlapStart = Math.max(segmentStart, bucketStart)
      const overlapEnd = Math.min(segmentEnd, bucketEnd)

      if (overlapStart < overlapEnd) {
        const current = buckets.get(bucketStart)
        if (current) {
          current.high = Math.max(current.high, point.price)
          current.low = Math.min(current.low, point.price)
          current.close = point.price
        } else {
          buckets.set(bucketStart, {
            bucketEndSlot: bucketEnd - 1,
            bucketStartSlot: bucketStart,
            open: point.price,
            high: point.price,
            low: point.price,
            close: point.price,
            volume: 0,
          })
        }
      }

      bucketStart += bucketSizeSlots
    }

    const volumeBucketStart = Math.floor(point.slot / bucketSizeSlots) * bucketSizeSlots
    const volumeBucket = buckets.get(volumeBucketStart)
    if (volumeBucket) {
      volumeBucket.volume += point.quoteVolume
    }
  }

  return Array.from(buckets.values())
    .sort((left, right) => left.bucketStartSlot - right.bucketStartSlot)
    .map((bucket) => ({
      endSlot: bucket.bucketEndSlot,
      startSlot: bucket.bucketStartSlot,
      timestampMs: Math.max(0, Math.round(anchorMs + bucket.bucketStartSlot * slotDurationMs)),
      open: bucket.open,
      high: bucket.high,
      low: bucket.low,
      close: bucket.close,
      volume: bucket.volume,
    }))
}

export function aggregateTradingViewCandles(
  events: MarketUpdateEvent[],
  intervalMs: number,
  baseDecimals: number,
  quoteDecimals: number,
  slotDurationMs: number,
) {
  const candles = aggregateSparseSlotCandles(events, intervalMs, baseDecimals, quoteDecimals, slotDurationMs)
  return candles.map<TradingViewAggregatedCandle>((candle) => ({
    endSlot: candle.endSlot,
    time: Math.floor(candle.timestampMs / 1000),
    startSlot: candle.startSlot,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }))
}

export function computeMarketStats(
  events: MarketUpdateEvent[],
  baseDecimals: number,
  quoteDecimals: number,
) {
  const threshold = Date.now() - 24 * 60 * 60 * 1000
  const recentEvents = events.filter((event) => new Date(event.created_at).getTime() >= threshold)
  if (recentEvents.length === 0) {
    return { high: null, low: null, volumeQuote: null }
  }

  const prices = recentEvents
    .map((event) =>
      marketPriceFromFlows(event.base_flow, event.quote_flow, baseDecimals, quoteDecimals),
    )
    .filter((value): value is number => value !== null)

  if (prices.length === 0) {
    return { high: null, low: null, volumeQuote: null }
  }

  const volumeQuote = recentEvents.reduce((sum, event) => {
    return sum + Math.abs(Number(event.quote_flow) / 10 ** quoteDecimals)
  }, 0)

  return {
    high: Math.max(...prices),
    low: Math.min(...prices),
    volumeQuote,
  }
}

export function computeAveragePrice(
  quoteAtoms: bigint,
  quoteDecimals: number,
  baseAtoms: bigint,
  baseDecimals: number,
) {
  if (baseAtoms <= 0n) return null
  const quoteUi = Number(quoteAtoms) / 10 ** quoteDecimals
  const baseUi = Number(baseAtoms) / 10 ** baseDecimals
  if (!Number.isFinite(quoteUi) || !Number.isFinite(baseUi) || baseUi === 0) return null

  const price = quoteUi / baseUi
  if (!Number.isFinite(price) || price <= 0) return null
  return price
}
