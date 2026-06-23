import { SLOT_DURATION_MS } from '../constants'
import { buildClosedPositionSummary } from '../view-models/closed-position'
import { formatAtoms } from './format'
import { getActivePositionMetrics } from './position-progress'
import { mergeAdjacentRanges } from './slot-ranges'
import type { Address } from '@solana/kit'
import type {
  ClosePositionEvent,
  MarketUpdateEvent,
} from '@/integrations/read-api'
import type {
  StreamingMarketState,
  TradePositionRecord,
} from '../domain/models'
import type { SlotRange } from './slot-ranges'

export type ChartPositionSide = 'buy' | 'sell'
export type ChartPositionStatus = 'active' | 'closed'

export interface SlotTimeAnchor {
  slot: number
  timeMs: number
}

export interface ChartPositionOverlay {
  averagePrice: number
  endTime: number
  id: string
  label: string
  side: ChartPositionSide
  startTime: number
  status: ChartPositionStatus
}

function isFiniteSlot(value: number) {
  return Number.isFinite(value) && value >= 0
}

function isFiniteTimeMs(value: number) {
  return Number.isFinite(value) && value > 0
}

function toSlotRange(startSlot: number, endSlot: number): SlotRange | null {
  if (!isFiniteSlot(startSlot) || !isFiniteSlot(endSlot)) return null

  const normalizedStartSlot = Math.floor(Math.min(startSlot, endSlot))
  const normalizedEndSlot = Math.floor(Math.max(startSlot, endSlot))
  return {
    endSlot: normalizedEndSlot,
    startSlot: normalizedStartSlot,
  }
}

export function buildMarketTimeAnchors({
  events,
  extraAnchors = [],
}: {
  events: Array<MarketUpdateEvent>
  extraAnchors?: Array<SlotTimeAnchor>
}) {
  const anchorsBySlot = new Map<number, SlotTimeAnchor>()

  const addAnchor = ({ slot, timeMs }: SlotTimeAnchor) => {
    if (!isFiniteSlot(slot) || !isFiniteTimeMs(timeMs)) return
    anchorsBySlot.set(Math.floor(slot), {
      slot: Math.floor(slot),
      timeMs,
    })
  }

  for (const event of events) {
    addAnchor({
      slot: event.slot,
      timeMs: new Date(event.created_at).getTime(),
    })
  }

  for (const anchor of extraAnchors) {
    addAnchor(anchor)
  }

  return Array.from(anchorsBySlot.values()).sort((left, right) => {
    if (left.slot === right.slot) return left.timeMs - right.timeMs
    return left.slot - right.slot
  })
}

function getSlotDurationMs(
  left: SlotTimeAnchor,
  right: SlotTimeAnchor,
  fallbackSlotDurationMs: number,
) {
  const slotDelta = right.slot - left.slot
  if (slotDelta === 0) return fallbackSlotDurationMs

  const timeDelta = right.timeMs - left.timeMs
  const duration = timeDelta / slotDelta
  return Number.isFinite(duration) && duration > 0
    ? duration
    : fallbackSlotDurationMs
}

export function estimateTimeMsForSlot(
  anchors: Array<SlotTimeAnchor>,
  slot: number,
  fallbackSlotDurationMs = SLOT_DURATION_MS,
) {
  if (!isFiniteSlot(slot) || anchors.length === 0) return null

  const normalizedSlot = Math.floor(slot)
  const upperIndex = anchors.findIndex(
    (anchor) => anchor.slot >= normalizedSlot,
  )

  if (upperIndex >= 0 && anchors[upperIndex].slot === normalizedSlot) {
    return anchors[upperIndex].timeMs
  }

  if (upperIndex < 0) {
    const last = anchors.at(-1)
    const previous = anchors.at(-2)
    if (!last) return null

    const duration =
      previous === undefined
        ? fallbackSlotDurationMs
        : getSlotDurationMs(previous, last, fallbackSlotDurationMs)
    return last.timeMs + (normalizedSlot - last.slot) * duration
  }

  const upper = anchors[upperIndex]

  if (upperIndex > 0) {
    const lower = anchors[upperIndex - 1]
    const duration = getSlotDurationMs(lower, upper, fallbackSlotDurationMs)
    return lower.timeMs + (normalizedSlot - lower.slot) * duration
  }

  const next = anchors.at(upperIndex + 1)
  const duration =
    next === undefined
      ? fallbackSlotDurationMs
      : getSlotDurationMs(upper, next, fallbackSlotDurationMs)
  return upper.timeMs - (upper.slot - normalizedSlot) * duration
}

export function buildChartPositionSlotRanges({
  activePositions,
  closedPositions,
  currentSlot,
}: {
  activePositions: Array<TradePositionRecord>
  closedPositions: Array<ClosePositionEvent>
  currentSlot: number | null
}) {
  const ranges: Array<SlotRange> = []

  for (const position of activePositions) {
    const startSlot = Number(position.data.startSlot)
    const positionEndSlot = Number(position.data.endSlot)
    const endSlot =
      currentSlot === null
        ? positionEndSlot
        : Math.min(Math.max(currentSlot, startSlot), positionEndSlot)
    const range = toSlotRange(startSlot, endSlot)
    if (range) ranges.push(range)
  }

  for (const position of closedPositions) {
    if (position.start_slot === null || position.end_slot === null) continue

    const lineEndSlot = Math.min(position.end_slot, position.slot)
    const range = toSlotRange(position.start_slot, lineEndSlot)
    if (range) ranges.push(range)
  }

  return mergeAdjacentRanges(ranges, 0)
}

export function buildChartPositionOverlays({
  activePositions,
  anchors,
  baseDecimals,
  baseTicker,
  closedPositions,
  currentSlot,
  marketAddress,
  quoteDecimals,
  quoteTicker,
  streamingState,
}: {
  activePositions: Array<TradePositionRecord>
  anchors: Array<SlotTimeAnchor>
  baseDecimals: number
  baseTicker: string
  closedPositions: Array<ClosePositionEvent>
  currentSlot: number | null
  marketAddress: Address | undefined
  quoteDecimals: number
  quoteTicker: string
  streamingState: StreamingMarketState | null
}): Array<ChartPositionOverlay> {
  const overlays: Array<ChartPositionOverlay> = []

  if (marketAddress && currentSlot !== null) {
    for (const position of activePositions) {
      const metrics = getActivePositionMetrics({
        baseDecimals,
        baseTicker,
        endSlotBookkeepingSnapshot: null,
        market: marketAddress,
        position: position.data,
        quoteDecimals,
        quoteTicker,
        streamingState,
      })
      if (metrics.averagePrice === null) continue

      const startSlot = Number(position.data.startSlot)
      const positionEndSlot = Number(position.data.endSlot)
      const lineEndSlot = Math.min(
        Math.max(currentSlot, startSlot),
        positionEndSlot,
      )
      const startTimeMs = estimateTimeMsForSlot(anchors, startSlot)
      const endTimeMs = estimateTimeMsForSlot(anchors, lineEndSlot)
      if (startTimeMs === null || endTimeMs === null) continue

      overlays.push({
        averagePrice: metrics.averagePrice,
        endTime: Math.floor(endTimeMs / 1000),
        id: `active-${position.address}`,
        label: `${metrics.sideLabel} ${formatAtoms(
          metrics.amountAtoms,
          metrics.depositedDecimals,
        )} ${metrics.depositedToken}`,
        side: position.data.isBuy === 1 ? 'buy' : 'sell',
        startTime: Math.floor(startTimeMs / 1000),
        status: currentSlot < positionEndSlot ? 'active' : 'closed',
      })
    }
  }

  for (const position of closedPositions) {
    if (position.start_slot === null || position.end_slot === null) continue

    const summary = buildClosedPositionSummary({
      baseDecimals,
      baseTicker,
      event: position,
      quoteDecimals,
      quoteTicker,
    })
    if (summary.averageFillPrice === null) continue

    const lineEndSlot = Math.min(position.end_slot, position.slot)
    const startTimeMs = estimateTimeMsForSlot(anchors, position.start_slot)
    const endTimeMs = estimateTimeMsForSlot(anchors, lineEndSlot)
    if (startTimeMs === null || endTimeMs === null) continue

    overlays.push({
      averagePrice: summary.averageFillPrice,
      endTime: Math.floor(endTimeMs / 1000),
      id: `closed-${position.id}`,
      label: `${summary.sideLabel} ${formatAtoms(
        summary.consumedAtoms,
        summary.depositDecimals,
      )} ${summary.depositToken}`,
      side: summary.isBuy ? 'buy' : 'sell',
      startTime: Math.floor(startTimeMs / 1000),
      status: 'closed',
    })
  }

  return overlays.sort((left, right) => {
    if (left.startTime === right.startTime) {
      return left.averagePrice - right.averagePrice
    }
    return left.startTime - right.startTime
  })
}
