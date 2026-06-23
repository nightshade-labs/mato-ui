import {
  CHART_HISTORY_REQUEST_BASE_THRESHOLD_BARS,
  CHART_HISTORY_REQUEST_BUFFER_BARS,
  CHART_HISTORY_REQUEST_MIN_BARS,
  CHART_HISTORY_REQUEST_THRESHOLD_RATIO,
} from '../constants'
import type { TradingViewAggregatedCandle } from './market'
import type { SlotRange } from './slot-ranges'

export interface LogicalRangeLike {
  from: number
  to: number
}

export interface OlderChartHistoryRequest {
  visibleBarCount: number
}

export function buildOlderChartHistoryRequest({
  barsBefore,
  data,
  logicalRange,
  thresholdBars = CHART_HISTORY_REQUEST_BASE_THRESHOLD_BARS,
  thresholdRatio = CHART_HISTORY_REQUEST_THRESHOLD_RATIO,
}: {
  barsBefore: number | null
  data: Array<TradingViewAggregatedCandle>
  logicalRange: LogicalRangeLike | null
  thresholdBars?: number
  thresholdRatio?: number
}): OlderChartHistoryRequest | null {
  if (!logicalRange || barsBefore === null || data.length === 0) {
    return null
  }

  const fromIndex = Math.max(0, Math.floor(logicalRange.from))
  const toIndex = Math.min(data.length - 1, Math.ceil(logicalRange.to))
  const visibleBarCount = Math.max(1, toIndex - fromIndex + 1)
  const effectiveThresholdBars = Math.max(
    thresholdBars,
    Math.ceil(visibleBarCount * thresholdRatio),
  )

  if (barsBefore > effectiveThresholdBars) {
    return null
  }

  return {
    visibleBarCount,
  }
}

export function buildOlderChartHistoryRange({
  oldestLoadedSlot,
  slotsPerBar,
  visibleBarCount,
  bufferBars = CHART_HISTORY_REQUEST_BUFFER_BARS,
  minimumRequestBars = CHART_HISTORY_REQUEST_MIN_BARS,
}: {
  bufferBars?: number
  minimumRequestBars?: number
  oldestLoadedSlot: number
  slotsPerBar: number
  visibleBarCount: number
}): SlotRange | null {
  const normalizedSlotsPerBar = Math.max(1, Math.floor(slotsPerBar))
  const effectiveBufferBars = Math.max(
    bufferBars,
    Math.ceil(visibleBarCount * 0.5),
  )
  const barsToLoad = Math.max(
    visibleBarCount + effectiveBufferBars,
    minimumRequestBars,
  )
  const startSlot = Math.max(
    0,
    oldestLoadedSlot - barsToLoad * normalizedSlotsPerBar,
  )
  const endSlot = oldestLoadedSlot - 1

  if (startSlot > endSlot) {
    return null
  }

  return {
    endSlot,
    startSlot,
  }
}

export function computePrependedLogicalRange({
  nextFirstTime,
  nextLastTime,
  nextLength,
  previousFirstTime,
  previousLastTime,
  previousLength,
  previousRange,
}: {
  nextFirstTime: number | null
  nextLastTime: number | null
  nextLength: number
  previousFirstTime: number | null
  previousLastTime: number | null
  previousLength: number
  previousRange: LogicalRangeLike | null
}): LogicalRangeLike | null {
  if (!previousRange || previousLength <= 0 || nextLength <= previousLength) {
    return null
  }

  const prependedHistory =
    previousFirstTime !== null &&
    previousLastTime !== null &&
    nextFirstTime !== null &&
    nextLastTime !== null &&
    nextFirstTime < previousFirstTime &&
    nextLastTime === previousLastTime

  if (!prependedHistory) {
    return null
  }

  const barsAdded = nextLength - previousLength
  return {
    from: previousRange.from + barsAdded,
    to: previousRange.to + barsAdded,
  }
}
