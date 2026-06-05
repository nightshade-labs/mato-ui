import { describe, expect, it } from 'vitest'
import {
  buildOlderChartHistoryRange,
  buildOlderChartHistoryRequest,
  computePrependedLogicalRange,
} from './chart-history'
import type { TradingViewAggregatedCandle } from './market'

function candle(slot: number): TradingViewAggregatedCandle {
  return {
    averagePrice: 100 + slot,
    close: 100 + slot,
    endSlot: slot + 9,
    high: 101 + slot,
    low: 99 + slot,
    open: 100 + slot,
    startSlot: slot,
    time: slot,
    volume: 10,
  }
}

describe('buildOlderChartHistoryRequest', () => {
  it('returns the oldest visible candle when the logical range approaches the left threshold', () => {
    const data = Array.from({ length: 100 }, (_, index) => candle(index * 10))

    expect(
      buildOlderChartHistoryRequest({
        barsBefore: 5,
        data,
        logicalRange: { from: 5.2, to: 35.7 },
      }),
    ).toEqual({
      visibleBarCount: 32,
    })
  })

  it('does not request older history when the visible range is not near the left edge', () => {
    const data = Array.from({ length: 100 }, (_, index) => candle(index * 10))

    expect(
      buildOlderChartHistoryRequest({
        barsBefore: 45,
        data,
        logicalRange: { from: 45, to: 70 },
      }),
    ).toBeNull()
  })

  it('requests a bit earlier for wider visible windows', () => {
    const data = Array.from({ length: 200 }, (_, index) => candle(index * 10))

    expect(
      buildOlderChartHistoryRequest({
        barsBefore: 26,
        data,
        logicalRange: { from: 26, to: 106 },
      }),
    ).toEqual({
      visibleBarCount: 81,
    })
  })
})

describe('buildOlderChartHistoryRange', () => {
  it('builds a buffered older slot window from the visible chart request', () => {
    expect(
      buildOlderChartHistoryRange({
        oldestLoadedSlot: 4_000,
        slotsPerBar: 150,
        visibleBarCount: 30,
      }),
    ).toEqual({
      endSlot: 3_999,
      startSlot: 0,
    })
  })

  it('returns null when there is no older slot range left to request', () => {
    expect(
      buildOlderChartHistoryRange({
        oldestLoadedSlot: 1_000,
        slotsPerBar: 5,
        visibleBarCount: 1,
        bufferBars: 0,
        minimumRequestBars: 1,
      }),
    ).toEqual({
      endSlot: 999,
      startSlot: 990,
    })
  })

  it('uses a larger default backfill window to reduce repeat edge requests', () => {
    expect(
      buildOlderChartHistoryRange({
        oldestLoadedSlot: 4_000,
        slotsPerBar: 20,
        visibleBarCount: 5,
      }),
    ).toEqual({
      endSlot: 3_999,
      startSlot: 2_560,
    })
  })

  it('pages backward from the oldest loaded slot instead of the visible slot', () => {
    expect(
      buildOlderChartHistoryRange({
        oldestLoadedSlot: 90_000,
        slotsPerBar: 9_000,
        visibleBarCount: 8,
      }),
    ).toEqual({
      endSlot: 89_999,
      startSlot: 0,
    })
  })
})

describe('computePrependedLogicalRange', () => {
  it('keeps the viewport stable when older candles are prepended', () => {
    expect(
      computePrependedLogicalRange({
        nextFirstTime: 50,
        nextLastTime: 500,
        nextLength: 60,
        previousFirstTime: 100,
        previousLastTime: 500,
        previousLength: 50,
        previousRange: { from: 12, to: 42 },
      }),
    ).toEqual({ from: 22, to: 52 })
  })

  it('returns null when the new data is not a pure prepend', () => {
    expect(
      computePrependedLogicalRange({
        nextFirstTime: 100,
        nextLastTime: 510,
        nextLength: 51,
        previousFirstTime: 100,
        previousLastTime: 500,
        previousLength: 50,
        previousRange: { from: 12, to: 42 },
      }),
    ).toBeNull()
  })
})
