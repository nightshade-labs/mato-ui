import type { MarketPricePoint } from './mini-chart'
import type { SlotRange } from './slot-ranges'

export interface MarketHistoryRangeRequest {
  endSlot: number
  reason: 'main-chart' | 'mini-chart'
  startSlot: number
}

export interface MarketHistoryStoreState {
  failedRanges: SlotRange[]
  loadedRanges: SlotRange[]
  marketId: number
  pendingRanges: SlotRange[]
  points: MarketPricePoint[]
}

export interface EnsureHistoryOptions {
  maxGapSlots?: number
  reason: 'main-chart' | 'mini-chart'
}

export interface MarketHistoryStoreSnapshot extends MarketHistoryStoreState {
  earliestLoadedSlot: number | null
  latestLoadedSlot: number | null
}

export interface MarketHistoryStore {
  ensureRange: (range: SlotRange, options: EnsureHistoryOptions) => Promise<void>
  ensureRanges: (ranges: SlotRange[], options: EnsureHistoryOptions) => Promise<void>
  getPointsForRange: (range: SlotRange) => MarketPricePoint[]
  getSnapshot: () => MarketHistoryStoreSnapshot
  hasCoverage: (range: SlotRange) => boolean
}

export function createEmptyMarketHistoryState(marketId: number): MarketHistoryStoreState {
  return {
    failedRanges: [],
    loadedRanges: [],
    marketId,
    pendingRanges: [],
    points: [],
  }
}

export function createMarketHistorySnapshot(
  state: MarketHistoryStoreState,
): MarketHistoryStoreSnapshot {
  const earliestLoadedSlot = state.loadedRanges[0]?.startSlot ?? null
  const latestLoadedSlot =
    state.loadedRanges.length === 0
      ? null
      : state.loadedRanges[state.loadedRanges.length - 1].endSlot

  return {
    ...state,
    earliestLoadedSlot,
    latestLoadedSlot,
  }
}
