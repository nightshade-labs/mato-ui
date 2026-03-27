import { describe, expect, it } from 'vitest'
import { aggregateTradingViewCandles } from './market'
import type { MarketUpdateEvent } from '@/integrations/supabase'
import type { MarketTimeAnchor } from './market'

function marketEvent(slot: number, createdAtMs: number): MarketUpdateEvent {
  return {
    base_flow: 1_000_000_000n,
    created_at: new Date(createdAtMs).toISOString(),
    id: slot,
    market_id: 1,
    quote_flow: BigInt((slot + 100) * 1_000_000_000),
    signature: `sig-${slot}`,
    slot,
  }
}

describe('aggregateTradingViewCandles', () => {
  it('keeps existing candle timestamps stable with a fixed anchor', () => {
    const slotDurationMs = 400
    const intervalMs = slotDurationMs * 10
    const anchor: MarketTimeAnchor = {
      slot: 30,
      timeMs: 1_700_000_000_000,
    }

    const baseEvents = [
      marketEvent(20, anchor.timeMs - intervalMs),
      marketEvent(30, anchor.timeMs),
    ]
    const extendedEvents = [
      marketEvent(10, anchor.timeMs - intervalMs * 2),
      ...baseEvents,
      marketEvent(40, anchor.timeMs + intervalMs),
    ]

    const baseCandles = aggregateTradingViewCandles(
      baseEvents,
      intervalMs,
      9,
      9,
      slotDurationMs,
      anchor,
    )
    const extendedCandles = aggregateTradingViewCandles(
      extendedEvents,
      intervalMs,
      9,
      9,
      slotDurationMs,
      anchor,
    )

    expect(baseCandles.map((candle) => candle.startSlot)).toEqual([20, 30])
    expect(extendedCandles.map((candle) => candle.startSlot)).toEqual([
      10, 20, 30, 40,
    ])
    expect(extendedCandles[1]?.time).toBe(baseCandles[0]?.time)
    expect(extendedCandles[2]?.time).toBe(baseCandles[1]?.time)
  })
})
