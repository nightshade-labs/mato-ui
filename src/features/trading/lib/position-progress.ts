import type { Address } from '@solana/kit'
import type { TradePosition } from '@/lib/generated/twob/src/generated/accounts'
import type { StreamingMarketState } from '../domain/models'
import { computeAveragePrice } from './market'

export interface PositionProgressMetrics {
  amountAtoms: bigint
  averagePrice: number | null
  consumedAtoms: bigint
  depositedDecimals: number
  depositedToken: string
  flowAtomsPerSlot: bigint
  flowLabel: string
  hasPositionEnded: boolean
  market: Address
  position: TradePosition
  positionKey: string
  progressPercent: number
  remainingAtoms: bigint
  remainingPercent: number
  sideLabel: 'Buy' | 'Sell'
  swappedAtoms: bigint | null
  swappedDecimals: number
  swappedToken: string
}

const BOOKKEEPING_PRECISION_FACTOR = 1_000_000_000_000_000n
const FLOW_PRECISION_FACTOR = 1_000_000_000n
const lastSwappedEstimateByPosition = new Map<
  string,
  { amount: bigint; consumedAtoms: bigint; source: 'active' | 'fallback' | 'snapshot' }
>()
const projectedEndEstimateByPosition = new Map<string, { amount: bigint; consumedAtoms: bigint }>()

function clampToRange(value: number, min: number, max: number) {
  if (value < min) return min
  if (value > max) return max
  return value
}

export function getActivePositionMetrics({
  market,
  position,
  baseTicker,
  quoteTicker,
  baseDecimals,
  quoteDecimals,
  streamingState,
  endSlotBookkeepingSnapshot,
}: {
  market: Address
  position: TradePosition
  baseTicker: string
  quoteTicker: string
  baseDecimals: number
  quoteDecimals: number
  streamingState: StreamingMarketState | null
  endSlotBookkeepingSnapshot: bigint | null
}): PositionProgressMetrics {
  const isBuy = position.isBuy === 1
  const depositedToken = isBuy ? quoteTicker : baseTicker
  const depositedDecimals = isBuy ? quoteDecimals : baseDecimals
  const swappedToken = isBuy ? baseTicker : quoteTicker
  const swappedDecimals = isBuy ? baseDecimals : quoteDecimals
  const sideLabel = isBuy ? 'Buy' : 'Sell'
  const flowLabel = isBuy ? `${quoteTicker} → ${baseTicker}` : `${baseTicker} → ${quoteTicker}`
  const positionKey = `${position.authority}:${position.id.toString()}`

  const amountAtoms = position.amount
  const startSlot = Number(position.startSlot)
  const endSlot = Number(position.endSlot)
  const durationSlots = Math.max(1, endSlot - startSlot)
  const scaledFlowAtomsPerSlot = (amountAtoms * FLOW_PRECISION_FACTOR) / BigInt(durationSlots)
  const flowAtomsPerSlot = scaledFlowAtomsPerSlot / FLOW_PRECISION_FACTOR

  const currentSlot = streamingState ? clampToRange(streamingState.currentSlot, startSlot, endSlot) : startSlot
  const hasPositionEnded = streamingState ? streamingState.currentSlot > endSlot : false
  const elapsedSlots = clampToRange(currentSlot - startSlot, 0, durationSlots)
  const scaledDepositAtoms = amountAtoms * FLOW_PRECISION_FACTOR
  const scaledSpentAtomsUncapped = BigInt(elapsedSlots) * scaledFlowAtomsPerSlot
  const scaledSpentAtoms = scaledSpentAtomsUncapped > scaledDepositAtoms ? scaledDepositAtoms : scaledSpentAtomsUncapped
  const scaledRemainingAtoms = scaledDepositAtoms > scaledSpentAtoms ? scaledDepositAtoms - scaledSpentAtoms : 0n
  const remainingAtoms = scaledRemainingAtoms / FLOW_PRECISION_FACTOR
  const consumedAtoms = amountAtoms > remainingAtoms ? amountAtoms - remainingAtoms : 0n

  const scaledSpentAtEndUncapped = BigInt(durationSlots) * scaledFlowAtomsPerSlot
  const scaledSpentAtEnd = scaledSpentAtEndUncapped > scaledDepositAtoms ? scaledDepositAtoms : scaledSpentAtEndUncapped
  const scaledRemainingAtEnd = scaledDepositAtoms > scaledSpentAtEnd ? scaledDepositAtoms - scaledSpentAtEnd : 0n
  const consumedAtomsAtEnd = amountAtoms > scaledRemainingAtEnd / FLOW_PRECISION_FACTOR
    ? amountAtoms - scaledRemainingAtEnd / FLOW_PRECISION_FACTOR
    : 0n

  const remainingPercent = amountAtoms > 0n ? Number((remainingAtoms * 10_000n) / amountAtoms) / 100 : 0
  const progressPercent = Math.max(0, 100 - remainingPercent)

  let swappedAtoms: bigint | null = null
  let consumedAtomsForAverage = consumedAtoms

  if (streamingState) {
    const bookkeepingSnapshot = position.bookkeepingSnapshot
    const liveBookkeeping = isBuy
      ? streamingState.bookkeepingBasePerQuote
      : streamingState.bookkeepingQuotePerBase
    const liveBookkeepingDelta = liveBookkeeping > bookkeepingSnapshot ? liveBookkeeping - bookkeepingSnapshot : 0n

    let staleAccumulator = 0n
    if (!hasPositionEnded) {
      const staleSlots = Math.max(0, currentSlot - streamingState.bookkeepingLastUpdateSlot)
      if (staleSlots > 0) {
        const staleSlotCount = BigInt(staleSlots)
        if (isBuy) {
          if (streamingState.marketQuoteFlow > 0n) {
            staleAccumulator =
              (BOOKKEEPING_PRECISION_FACTOR * streamingState.marketBaseFlow * staleSlotCount) /
              streamingState.marketQuoteFlow
          }
        } else if (streamingState.marketBaseFlow > 0n) {
          staleAccumulator =
            (BOOKKEEPING_PRECISION_FACTOR * streamingState.marketQuoteFlow * staleSlotCount) /
            streamingState.marketBaseFlow
        }
      }
    }

    const liveAccumulatedPrice = liveBookkeepingDelta + staleAccumulator
    const liveSwappedEstimate =
      (scaledFlowAtomsPerSlot * liveAccumulatedPrice) / (FLOW_PRECISION_FACTOR * BOOKKEEPING_PRECISION_FACTOR)

    let perSlotBookkeepingAccumulator = 0n
    if (isBuy) {
      if (streamingState.marketQuoteFlow > 0n) {
        perSlotBookkeepingAccumulator =
          (BOOKKEEPING_PRECISION_FACTOR * streamingState.marketBaseFlow) / streamingState.marketQuoteFlow
      }
    } else if (streamingState.marketBaseFlow > 0n) {
      perSlotBookkeepingAccumulator =
        (BOOKKEEPING_PRECISION_FACTOR * streamingState.marketQuoteFlow) / streamingState.marketBaseFlow
    }

    const slotsToEnd = Math.max(0, endSlot - currentSlot)
    const projectedAccumulatedAtEnd = liveAccumulatedPrice + perSlotBookkeepingAccumulator * BigInt(slotsToEnd)
    const projectedEndSwappedEstimate =
      (scaledFlowAtomsPerSlot * projectedAccumulatedAtEnd) / (FLOW_PRECISION_FACTOR * BOOKKEEPING_PRECISION_FACTOR)

    if (!hasPositionEnded) {
      swappedAtoms = liveSwappedEstimate
      consumedAtomsForAverage = consumedAtoms
      lastSwappedEstimateByPosition.set(positionKey, {
        amount: liveSwappedEstimate,
        consumedAtoms,
        source: 'active',
      })
      projectedEndEstimateByPosition.set(positionKey, {
        amount: projectedEndSwappedEstimate,
        consumedAtoms: consumedAtomsAtEnd,
      })
    } else {
      const cachedEstimate = lastSwappedEstimateByPosition.get(positionKey) ?? null
      const projectedTerminalEstimate = projectedEndEstimateByPosition.get(positionKey) ?? null
      const snapshotDelta =
        endSlotBookkeepingSnapshot !== null && endSlotBookkeepingSnapshot > bookkeepingSnapshot
          ? endSlotBookkeepingSnapshot - bookkeepingSnapshot
          : null
      const snapshotSwappedEstimate =
        snapshotDelta === null
          ? null
          : (scaledFlowAtomsPerSlot * snapshotDelta) / (FLOW_PRECISION_FACTOR * BOOKKEEPING_PRECISION_FACTOR)

      let terminalFallbackAmount = cachedEstimate?.amount ?? null
      let terminalFallbackConsumed = cachedEstimate?.consumedAtoms ?? consumedAtoms
      if (
        projectedTerminalEstimate !== null &&
        (terminalFallbackAmount === null || projectedTerminalEstimate.amount > terminalFallbackAmount)
      ) {
        terminalFallbackAmount = projectedTerminalEstimate.amount
        terminalFallbackConsumed = projectedTerminalEstimate.consumedAtoms
      }

      if (snapshotSwappedEstimate === null) {
        if (terminalFallbackAmount !== null) {
          swappedAtoms = terminalFallbackAmount
          consumedAtomsForAverage = terminalFallbackConsumed
        } else {
          swappedAtoms = liveSwappedEstimate
          consumedAtomsForAverage = consumedAtoms
          lastSwappedEstimateByPosition.set(positionKey, {
            amount: liveSwappedEstimate,
            consumedAtoms,
            source: 'fallback',
          })
        }
      } else if (terminalFallbackAmount !== null && snapshotSwappedEstimate <= terminalFallbackAmount) {
        swappedAtoms = terminalFallbackAmount
        consumedAtomsForAverage = terminalFallbackConsumed
        lastSwappedEstimateByPosition.set(positionKey, {
          amount: terminalFallbackAmount,
          consumedAtoms: terminalFallbackConsumed,
          source: projectedTerminalEstimate !== null ? 'fallback' : cachedEstimate?.source ?? 'active',
        })
      } else {
        swappedAtoms = snapshotSwappedEstimate
        consumedAtomsForAverage = consumedAtoms
        lastSwappedEstimateByPosition.set(positionKey, {
          amount: swappedAtoms,
          consumedAtoms,
          source: 'snapshot',
        })
      }
    }

    const cachedMetrics = lastSwappedEstimateByPosition.get(positionKey) ?? null
    if (swappedAtoms !== null && cachedMetrics !== null && swappedAtoms < cachedMetrics.amount) {
      swappedAtoms = cachedMetrics.amount
      consumedAtomsForAverage = cachedMetrics.consumedAtoms
    }
  }

  const averagePrice = (() => {
    if (swappedAtoms === null) return null
    const quoteAtoms = isBuy ? consumedAtomsForAverage : swappedAtoms
    const baseAtoms = isBuy ? swappedAtoms : consumedAtomsForAverage
    return computeAveragePrice(quoteAtoms, quoteDecimals, baseAtoms, baseDecimals)
  })()

  return {
    amountAtoms,
    averagePrice,
    consumedAtoms,
    depositedDecimals,
    depositedToken,
    flowAtomsPerSlot: flowAtomsPerSlot > 0n ? flowAtomsPerSlot : 0n,
    flowLabel,
    hasPositionEnded,
    market,
    position,
    positionKey,
    progressPercent,
    remainingAtoms,
    remainingPercent,
    sideLabel,
    swappedAtoms,
    swappedDecimals,
    swappedToken,
  }
}
