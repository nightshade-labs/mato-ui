import type { MarketUpdateEvent } from '@/integrations/supabase'
import type { MarketPriceSnapshot } from '../domain/models'

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

interface TimeBucketCandle {
  bucketStartMs: number
  endSlot: number
  startSlot: number
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

export interface MarketTimeAnchor {
  slot: number
  timeMs: number
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
  events: Array<MarketUpdateEvent>,
  baseScale: number,
  quoteScale: number,
): Array<SlotPricePoint> {
  const latestPerSlot = new Map<number, SlotPricePoint>()

  for (const event of events) {
    if (event.base_flow === 0n) continue
    const base = Number(event.base_flow) / baseScale
    const quote = Number(event.quote_flow) / quoteScale
    if (!Number.isFinite(base) || !Number.isFinite(quote) || base === 0)
      continue
    const price = Math.abs(quote) / Math.abs(base)
    const quoteVolume = Math.abs(Number(event.quote_flow) / quoteScale)
    const createdAtMs = new Date(event.created_at).getTime()
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(createdAtMs))
      continue

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

  return Array.from(latestPerSlot.values()).sort((left, right) => {
    if (left.createdAtMs === right.createdAtMs) {
      return left.slot - right.slot
    }
    return left.createdAtMs - right.createdAtMs
  })
}

function aggregateSparseSlotCandles(
  events: Array<MarketUpdateEvent>,
  intervalMs: number,
  baseDecimals: number,
  quoteDecimals: number,
  _slotDurationMs: number,
  _timeAnchor?: MarketTimeAnchor,
): Array<NormalizedCandle> {
  if (intervalMs <= 0) return []

  const baseScale = 10 ** baseDecimals
  const quoteScale = 10 ** quoteDecimals
  const points = normalizePoints(events, baseScale, quoteScale)
  if (points.length === 0) return []

  const firstPoint = points[0]
  const latestPoint = points[points.length - 1]
  const firstBucketStart =
    Math.floor(firstPoint.createdAtMs / intervalMs) * intervalMs
  const lastBucketStart =
    Math.floor(latestPoint.createdAtMs / intervalMs) * intervalMs
  const buckets: Array<TimeBucketCandle> = []

  let pointIndex = 0
  let lastKnownPrice: number | null = null
  let lastKnownSlot: number | null = null

  for (
    let bucketStart = firstBucketStart;
    bucketStart <= lastBucketStart;
    bucketStart += intervalMs
  ) {
    const bucketEnd = bucketStart + intervalMs

    while (
      pointIndex < points.length &&
      points[pointIndex].createdAtMs < bucketStart
    ) {
      lastKnownPrice = points[pointIndex].price
      lastKnownSlot = points[pointIndex].slot
      pointIndex += 1
    }

    const nextPoint = points[pointIndex] ?? points[points.length - 1]
    const bucketSeedPrice = lastKnownPrice ?? nextPoint.price
    const bucketSeedSlot = lastKnownSlot ?? nextPoint.slot

    const bucket: TimeBucketCandle = {
      bucketStartMs: bucketStart,
      endSlot: bucketSeedSlot,
      startSlot: bucketSeedSlot,
      close: bucketSeedPrice,
      high: bucketSeedPrice,
      low: bucketSeedPrice,
      open: bucketSeedPrice,
      volume: 0,
    }

    let bucketPointIndex = pointIndex
    while (
      bucketPointIndex < points.length &&
      points[bucketPointIndex].createdAtMs < bucketEnd
    ) {
      const point = points[bucketPointIndex]

      if (bucket.volume === 0 && bucketPointIndex === pointIndex) {
        bucket.startSlot = point.slot
      }
      bucket.high = Math.max(bucket.high, point.price)
      bucket.low = Math.min(bucket.low, point.price)
      bucket.close = point.price
      bucket.volume += point.quoteVolume
      bucket.endSlot = point.slot
      lastKnownPrice = point.price
      lastKnownSlot = point.slot
      bucketPointIndex += 1
    }

    pointIndex = bucketPointIndex
    buckets.push(bucket)
  }

  return buckets.map((bucket) => ({
    endSlot: bucket.endSlot,
    startSlot: bucket.startSlot,
    timestampMs: bucket.bucketStartMs,
    open: bucket.open,
    high: bucket.high,
    low: bucket.low,
    close: bucket.close,
    volume: bucket.volume,
  }))
}

export function aggregateTradingViewCandles(
  events: Array<MarketUpdateEvent>,
  intervalMs: number,
  baseDecimals: number,
  quoteDecimals: number,
  slotDurationMs: number,
  timeAnchor?: MarketTimeAnchor,
) {
  const candles = aggregateSparseSlotCandles(
    events,
    intervalMs,
    baseDecimals,
    quoteDecimals,
    slotDurationMs,
    timeAnchor,
  )
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

export function mergeLivePriceIntoCandles({
  candles,
  intervalMs,
  priceSnapshot,
}: {
  candles: Array<TradingViewAggregatedCandle>
  intervalMs: number
  priceSnapshot: MarketPriceSnapshot | null | undefined
}) {
  const price = priceSnapshot?.price
  const slot = priceSnapshot?.slot
  const eventTimeMs = priceSnapshot?.eventTimeMs

  if (
    typeof price !== 'number' ||
    typeof slot !== 'number' ||
    typeof eventTimeMs !== 'number' ||
    !Number.isFinite(price) ||
    !Number.isFinite(slot) ||
    !Number.isFinite(eventTimeMs) ||
    price <= 0 ||
    slot < 0 ||
    intervalMs <= 0
  ) {
    return candles
  }

  const bucketStartMs = Math.floor(eventTimeMs / intervalMs) * intervalMs
  const bucketTime = Math.floor(bucketStartMs / 1000)
  const latestCandle = candles.at(-1)

  if (!latestCandle) {
    return [
      {
        close: price,
        endSlot: slot,
        high: price,
        low: price,
        open: price,
        startSlot: slot,
        time: bucketTime,
        volume: 0,
      },
    ]
  }

  if (bucketTime < latestCandle.time || slot < latestCandle.endSlot) {
    return candles
  }

  if (bucketTime === latestCandle.time) {
    const updatedCandle = {
      ...latestCandle,
      close: price,
      endSlot: slot,
      high: Math.max(latestCandle.high, price),
      low: Math.min(latestCandle.low, price),
    }

    if (
      updatedCandle.close === latestCandle.close &&
      updatedCandle.endSlot === latestCandle.endSlot &&
      updatedCandle.high === latestCandle.high &&
      updatedCandle.low === latestCandle.low
    ) {
      return candles
    }

    return [...candles.slice(0, -1), updatedCandle]
  }

  const open = latestCandle.close
  return [
    ...candles,
    {
      close: price,
      endSlot: slot,
      high: Math.max(open, price),
      low: Math.min(open, price),
      open,
      startSlot: slot,
      time: bucketTime,
      volume: 0,
    },
  ]
}

export function computeMarketStats(
  events: Array<MarketUpdateEvent>,
  baseDecimals: number,
  quoteDecimals: number,
) {
  const threshold = Date.now() - 24 * 60 * 60 * 1000
  const recentEvents = events.filter(
    (event) => new Date(event.created_at).getTime() >= threshold,
  )
  if (recentEvents.length === 0) {
    return { high: null, low: null, volumeQuote: null }
  }

  const prices = recentEvents
    .map((event) =>
      marketPriceFromFlows(
        event.base_flow,
        event.quote_flow,
        baseDecimals,
        quoteDecimals,
      ),
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
  if (!Number.isFinite(quoteUi) || !Number.isFinite(baseUi) || baseUi === 0)
    return null

  const price = quoteUi / baseUi
  if (!Number.isFinite(price) || price <= 0) return null
  return price
}
