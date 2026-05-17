import { describe, expect, it } from 'vitest'
import {
  aggregateTradingViewCandles,
  mergeLivePriceIntoCandles,
} from './market'
import type { MarketUpdateEvent } from '@/integrations/supabase'
import type { TradingViewAggregatedCandle } from './market'

function marketEvent(
  slot: number,
  createdAtMs: number,
  price = slot + 100,
): MarketUpdateEvent {
  return {
    base_flow: 1_000_000_000n,
    created_at: new Date(createdAtMs).toISOString(),
    id: slot,
    market_id: 1,
    quote_flow: BigInt(price * 1_000_000_000),
    signature: `sig-${slot}`,
    slot,
  }
}

describe('aggregateTradingViewCandles', () => {
  it('keeps existing candle timestamps stable when history is extended', () => {
    const slotDurationMs = 400
    const intervalMs = 60_000
    const baseTimeMs = Date.parse('2026-03-27T10:00:00.000Z')

    const baseEvents = [
      marketEvent(20, baseTimeMs + 10_000, 120),
      marketEvent(30, baseTimeMs + 65_000, 130),
    ]
    const extendedEvents = [
      marketEvent(10, baseTimeMs - 10_000, 110),
      ...baseEvents,
      marketEvent(40, baseTimeMs + 130_000, 140),
    ]

    const baseCandles = aggregateTradingViewCandles(
      baseEvents,
      intervalMs,
      9,
      9,
      slotDurationMs,
    )
    const extendedCandles = aggregateTradingViewCandles(
      extendedEvents,
      intervalMs,
      9,
      9,
      slotDurationMs,
    )

    expect(baseCandles.map((candle) => candle.time)).toEqual([
      Math.floor(baseTimeMs / 1000),
      Math.floor((baseTimeMs + 60_000) / 1000),
    ])
    expect(extendedCandles.map((candle) => candle.time)).toEqual([
      Math.floor((baseTimeMs - 60_000) / 1000),
      Math.floor(baseTimeMs / 1000),
      Math.floor((baseTimeMs + 60_000) / 1000),
      Math.floor((baseTimeMs + 120_000) / 1000),
    ])
    expect(extendedCandles[1]?.time).toBe(baseCandles[0]?.time)
    expect(extendedCandles[2]?.time).toBe(baseCandles[1]?.time)
  })

  it('fills missing time buckets with the previous price when building candles', () => {
    const slotDurationMs = 400
    const intervalMs = 60_000
    const baseTimeMs = Date.parse('2026-03-27T10:00:00.000Z')

    const candles = aggregateTradingViewCandles(
      [
        marketEvent(0, baseTimeMs + 10_000, 100),
        marketEvent(25, baseTimeMs + 125_000, 200),
      ],
      intervalMs,
      9,
      9,
      slotDurationMs,
    )

    expect(candles.map((candle) => candle.time)).toEqual([
      Math.floor(baseTimeMs / 1000),
      Math.floor((baseTimeMs + 60_000) / 1000),
      Math.floor((baseTimeMs + 120_000) / 1000),
    ])
    expect(candles.map((candle) => candle.open)).toEqual([100, 100, 100])
    expect(candles.map((candle) => candle.close)).toEqual([100, 100, 200])
    expect(candles.map((candle) => candle.high)).toEqual([100, 100, 200])
    expect(candles.map((candle) => candle.low)).toEqual([100, 100, 100])
    expect(candles.map((candle) => candle.volume)).toEqual([100, 0, 200])
  })
})

function chartCandle(
  timeMs: number,
  overrides: Partial<TradingViewAggregatedCandle> = {},
): TradingViewAggregatedCandle {
  return {
    close: 102,
    endSlot: 10,
    high: 105,
    low: 95,
    open: 100,
    startSlot: 1,
    time: Math.floor(timeMs / 1000),
    volume: 50,
    ...overrides,
  }
}

describe('mergeLivePriceIntoCandles', () => {
  it('updates the current candle with the latest streamed price', () => {
    const intervalMs = 60_000
    const baseTimeMs = Date.parse('2026-03-27T10:00:00.000Z')
    const candles = [chartCandle(baseTimeMs)]

    const merged = mergeLivePriceIntoCandles({
      candles,
      intervalMs,
      priceSnapshot: {
        eventTimeMs: baseTimeMs + 30_000,
        price: 110,
        slot: 11,
      },
    })

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      close: 110,
      endSlot: 11,
      high: 110,
      low: 95,
      open: 100,
      volume: 50,
    })
  })

  it('opens a new candle when the streamed price lands in the next bucket', () => {
    const intervalMs = 60_000
    const baseTimeMs = Date.parse('2026-03-27T10:00:00.000Z')
    const candles = [chartCandle(baseTimeMs)]

    const merged = mergeLivePriceIntoCandles({
      candles,
      intervalMs,
      priceSnapshot: {
        eventTimeMs: baseTimeMs + 65_000,
        price: 98,
        slot: 12,
      },
    })

    expect(merged).toHaveLength(2)
    expect(merged[1]).toEqual({
      close: 98,
      endSlot: 12,
      high: 102,
      low: 98,
      open: 102,
      startSlot: 12,
      time: Math.floor((baseTimeMs + 60_000) / 1000),
      volume: 0,
    })
  })

  it('ignores older streamed prices that would move the chart backwards', () => {
    const intervalMs = 60_000
    const baseTimeMs = Date.parse('2026-03-27T10:00:00.000Z')
    const candles = [chartCandle(baseTimeMs)]

    const merged = mergeLivePriceIntoCandles({
      candles,
      intervalMs,
      priceSnapshot: {
        eventTimeMs: baseTimeMs + 20_000,
        price: 120,
        slot: 9,
      },
    })

    expect(merged).toBe(candles)
  })
})
