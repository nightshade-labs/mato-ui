import { computeAveragePrice } from './market'
import {
  getTradePositionEndSlot,
  isBuyTradePosition,
  isPausedTradePosition,
} from './trade-position'
import type { Address } from '@solana/kit'
import type { TradePosition } from '@/lib/generated/twob/src/generated/accounts'
import type { StreamingMarketState } from '../domain/models'

export interface PositionProgressMetrics {
  amountAtoms: bigint
  averagePrice: number | null
  claimableSwappedAtoms: bigint | null
  consumedAtoms: bigint
  depositedDecimals: number
  depositedToken: string
  flowAtomsPerSlot: bigint
  flowLabel: string
  hasPositionEnded: boolean
  isPaused: boolean
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
const FLOW_PRECISION_PART_ONE = 10_000n
const FLOW_PRECISION_PART_TWO = 100_000n
const FLOW_PRECISION_FACTOR = 1_000_000_000n
const MAX_U128 = (1n << 128n) - 1n
const POSITION_PROGRESS_STORAGE_KEY = 'twob:position-progress:v1'

type CachedSwappedEstimate = {
  amount: bigint
  consumedAtoms: bigint
  source: 'active' | 'fallback' | 'snapshot'
}

type CachedTerminalEstimate = {
  amount: bigint
  consumedAtoms: bigint
}

type PersistedPositionProgress = {
  projectedEndEstimate?: {
    amount: string
    consumedAtoms: string
  }
  swappedEstimate?: {
    amount: string
    consumedAtoms: string
    source: CachedSwappedEstimate['source']
  }
}

const lastSwappedEstimateByPosition = new Map<string, CachedSwappedEstimate>()
const projectedEndEstimateByPosition = new Map<string, CachedTerminalEstimate>()
let persistedPositionProgressCache: Partial<
  Record<string, PersistedPositionProgress>
> | null = null

function clampToRange(value: number, min: number, max: number) {
  if (value < min) return min
  if (value > max) return max
  return value
}

function calculateSwappedAmount(flow: bigint, accumulatedPrices: bigint) {
  const scaledFlow = flow / FLOW_PRECISION_PART_ONE
  if (scaledFlow === 0n || accumulatedPrices <= MAX_U128 / scaledFlow) {
    return (
      (scaledFlow * accumulatedPrices) /
      BOOKKEEPING_PRECISION_FACTOR /
      FLOW_PRECISION_PART_TWO
    )
  }

  return (
    ((flow / FLOW_PRECISION_FACTOR) * accumulatedPrices) /
    BOOKKEEPING_PRECISION_FACTOR
  )
}

function getPositionProgressStorage() {
  if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) {
    return null
  }

  try {
    return globalThis.sessionStorage
  } catch {
    return null
  }
}

function getPersistedPositionProgressCache() {
  if (persistedPositionProgressCache !== null)
    return persistedPositionProgressCache

  const storage = getPositionProgressStorage()
  if (!storage) {
    persistedPositionProgressCache = {}
    return persistedPositionProgressCache
  }

  try {
    const raw = storage.getItem(POSITION_PROGRESS_STORAGE_KEY)
    persistedPositionProgressCache = raw
      ? (JSON.parse(raw) as Record<string, PersistedPositionProgress>)
      : {}
  } catch {
    persistedPositionProgressCache = {}
  }

  return persistedPositionProgressCache
}

function persistPositionProgressCache() {
  const storage = getPositionProgressStorage()
  if (!storage || persistedPositionProgressCache === null) return

  try {
    storage.setItem(
      POSITION_PROGRESS_STORAGE_KEY,
      JSON.stringify(persistedPositionProgressCache),
    )
  } catch {
    // Ignore transient storage failures; the in-memory cache still prevents regressions until reload.
  }
}

function getCachedSwappedEstimate(positionKey: string) {
  const cached = lastSwappedEstimateByPosition.get(positionKey)
  if (cached) return cached

  const persisted =
    getPersistedPositionProgressCache()[positionKey]?.swappedEstimate
  if (!persisted) return null

  const hydrated = {
    amount: BigInt(persisted.amount),
    consumedAtoms: BigInt(persisted.consumedAtoms),
    source: persisted.source,
  } satisfies CachedSwappedEstimate
  lastSwappedEstimateByPosition.set(positionKey, hydrated)
  return hydrated
}

function setCachedSwappedEstimate(
  positionKey: string,
  estimate: CachedSwappedEstimate,
) {
  lastSwappedEstimateByPosition.set(positionKey, estimate)

  const cache = getPersistedPositionProgressCache()
  cache[positionKey] = {
    ...cache[positionKey],
    swappedEstimate: {
      amount: estimate.amount.toString(),
      consumedAtoms: estimate.consumedAtoms.toString(),
      source: estimate.source,
    },
  }
  persistPositionProgressCache()
}

function getProjectedEndEstimate(positionKey: string) {
  const cached = projectedEndEstimateByPosition.get(positionKey)
  if (cached) return cached

  const persisted =
    getPersistedPositionProgressCache()[positionKey]?.projectedEndEstimate
  if (!persisted) return null

  const hydrated = {
    amount: BigInt(persisted.amount),
    consumedAtoms: BigInt(persisted.consumedAtoms),
  } satisfies CachedTerminalEstimate
  projectedEndEstimateByPosition.set(positionKey, hydrated)
  return hydrated
}

function setProjectedEndEstimate(
  positionKey: string,
  estimate: CachedTerminalEstimate,
) {
  projectedEndEstimateByPosition.set(positionKey, estimate)

  const cache = getPersistedPositionProgressCache()
  cache[positionKey] = {
    ...cache[positionKey],
    projectedEndEstimate: {
      amount: estimate.amount.toString(),
      consumedAtoms: estimate.consumedAtoms.toString(),
    },
  }
  persistPositionProgressCache()
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
  const isBuy = isBuyTradePosition(position)
  const depositedToken = isBuy ? quoteTicker : baseTicker
  const depositedDecimals = isBuy ? quoteDecimals : baseDecimals
  const swappedToken = isBuy ? baseTicker : quoteTicker
  const swappedDecimals = isBuy ? baseDecimals : quoteDecimals
  const sideLabel = isBuy ? 'Buy' : 'Sell'
  const flowLabel = isBuy
    ? `${quoteTicker} → ${baseTicker}`
    : `${baseTicker} → ${quoteTicker}`
  const positionKey = `${position.authority}:${position.id.toString()}`
  const estimateCacheKey = `${positionKey}:${position.bookkeepingSnapshot.toString()}:${position.swappedAmountAtSnapshot.toString()}:${position.withdrawnAmount.toString()}`
  const isPaused = isPausedTradePosition(position)

  const amountAtoms = position.amount
  const endSlot = Number(getTradePositionEndSlot(position))
  const lastUpdateSlot = Number(position.lastUpdateSlot)
  const scaledFlowAtomsPerSlot = position.flow
  const flowAtomsPerSlot = scaledFlowAtomsPerSlot / FLOW_PRECISION_FACTOR

  const currentSlot = streamingState
    ? isPaused
      ? lastUpdateSlot
      : clampToRange(streamingState.currentSlot, lastUpdateSlot, endSlot)
    : lastUpdateSlot
  const hasPositionEnded =
    streamingState && !isPaused ? streamingState.currentSlot > endSlot : false
  const elapsedSlots = isPaused
    ? 0
    : clampToRange(currentSlot - lastUpdateSlot, 0, position.remainingSlots)
  const remainingSlotCount = Math.max(0, position.remainingSlots - elapsedSlots)
  const streamingRemainingAtoms =
    (scaledFlowAtomsPerSlot * BigInt(remainingSlotCount)) /
    FLOW_PRECISION_FACTOR
  const uncappedRemainingAtoms =
    position.inactiveRefund + streamingRemainingAtoms
  const remainingAtoms =
    uncappedRemainingAtoms > amountAtoms ? amountAtoms : uncappedRemainingAtoms
  const consumedAtoms =
    amountAtoms > remainingAtoms ? amountAtoms - remainingAtoms : 0n
  const consumedAtomsAtEnd =
    amountAtoms > position.inactiveRefund
      ? amountAtoms - position.inactiveRefund
      : 0n

  const remainingPercent =
    amountAtoms > 0n
      ? Number((remainingAtoms * 10_000n) / amountAtoms) / 100
      : 0
  const progressPercent = Math.max(0, 100 - remainingPercent)

  let swappedAtoms: bigint | null =
    isPaused || position.swappedAmountAtSnapshot > 0n
      ? position.swappedAmountAtSnapshot
      : null
  let consumedAtomsForAverage = consumedAtoms

  if (isPaused) {
    setCachedSwappedEstimate(estimateCacheKey, {
      amount: position.swappedAmountAtSnapshot,
      consumedAtoms,
      source: 'snapshot',
    })
  } else if (streamingState) {
    const bookkeepingSnapshot = position.bookkeepingSnapshot
    const liveBookkeeping = isBuy
      ? streamingState.bookkeepingBasePerQuote
      : streamingState.bookkeepingQuotePerBase
    const liveBookkeepingDelta =
      liveBookkeeping > bookkeepingSnapshot
        ? liveBookkeeping - bookkeepingSnapshot
        : 0n

    let staleAccumulator = 0n
    if (!hasPositionEnded) {
      const staleSlots = Math.max(
        0,
        currentSlot - streamingState.bookkeepingLastUpdateSlot,
      )
      if (staleSlots > 0) {
        const staleSlotCount = BigInt(staleSlots)
        if (isBuy) {
          if (streamingState.marketQuoteFlow > 0n) {
            staleAccumulator =
              (BOOKKEEPING_PRECISION_FACTOR *
                streamingState.marketBaseFlow *
                staleSlotCount) /
              streamingState.marketQuoteFlow
          }
        } else if (streamingState.marketBaseFlow > 0n) {
          staleAccumulator =
            (BOOKKEEPING_PRECISION_FACTOR *
              streamingState.marketQuoteFlow *
              staleSlotCount) /
            streamingState.marketBaseFlow
        }
      }
    }

    const liveAccumulatedPrice = liveBookkeepingDelta + staleAccumulator
    const liveSwappedEstimate =
      position.swappedAmountAtSnapshot +
      calculateSwappedAmount(scaledFlowAtomsPerSlot, liveAccumulatedPrice)

    let perSlotBookkeepingAccumulator = 0n
    if (isBuy) {
      if (streamingState.marketQuoteFlow > 0n) {
        perSlotBookkeepingAccumulator =
          (BOOKKEEPING_PRECISION_FACTOR * streamingState.marketBaseFlow) /
          streamingState.marketQuoteFlow
      }
    } else if (streamingState.marketBaseFlow > 0n) {
      perSlotBookkeepingAccumulator =
        (BOOKKEEPING_PRECISION_FACTOR * streamingState.marketQuoteFlow) /
        streamingState.marketBaseFlow
    }

    const slotsToEnd = Math.max(0, endSlot - currentSlot)
    const projectedAccumulatedAtEnd =
      liveAccumulatedPrice + perSlotBookkeepingAccumulator * BigInt(slotsToEnd)
    const projectedEndSwappedEstimate =
      position.swappedAmountAtSnapshot +
      calculateSwappedAmount(scaledFlowAtomsPerSlot, projectedAccumulatedAtEnd)

    if (!hasPositionEnded) {
      swappedAtoms = liveSwappedEstimate
      consumedAtomsForAverage = consumedAtoms
      setCachedSwappedEstimate(estimateCacheKey, {
        amount: liveSwappedEstimate,
        consumedAtoms,
        source: 'active',
      })
      setProjectedEndEstimate(estimateCacheKey, {
        amount: projectedEndSwappedEstimate,
        consumedAtoms: consumedAtomsAtEnd,
      })
    } else {
      const cachedEstimate = getCachedSwappedEstimate(estimateCacheKey)
      const projectedTerminalEstimate =
        getProjectedEndEstimate(estimateCacheKey)
      const snapshotDelta =
        endSlotBookkeepingSnapshot !== null &&
        endSlotBookkeepingSnapshot > bookkeepingSnapshot
          ? endSlotBookkeepingSnapshot - bookkeepingSnapshot
          : null
      const snapshotSwappedEstimate =
        snapshotDelta === null
          ? null
          : position.swappedAmountAtSnapshot +
            calculateSwappedAmount(scaledFlowAtomsPerSlot, snapshotDelta)

      const frozenAtEnd = cachedEstimate?.amount ?? null
      const frozenConsumedAtEnd = cachedEstimate?.consumedAtoms ?? null
      let terminalFallbackAmount = frozenAtEnd
      let terminalFallbackConsumed = frozenConsumedAtEnd ?? consumedAtoms
      if (
        projectedTerminalEstimate !== null &&
        (terminalFallbackAmount === null ||
          projectedTerminalEstimate.amount > terminalFallbackAmount)
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
          setCachedSwappedEstimate(estimateCacheKey, {
            amount: liveSwappedEstimate,
            consumedAtoms,
            source: 'fallback',
          })
        }
      } else {
        const shouldClampDrop =
          terminalFallbackAmount !== null &&
          (cachedEstimate?.source === 'active' ||
            projectedTerminalEstimate !== null)

        if (
          shouldClampDrop &&
          terminalFallbackAmount !== null &&
          snapshotSwappedEstimate <= terminalFallbackAmount
        ) {
          swappedAtoms = terminalFallbackAmount
          consumedAtomsForAverage = terminalFallbackConsumed
          setCachedSwappedEstimate(estimateCacheKey, {
            amount: terminalFallbackAmount,
            consumedAtoms: consumedAtomsForAverage,
            source:
              projectedTerminalEstimate !== null
                ? 'fallback'
                : (cachedEstimate?.source ?? 'active'),
          })
        } else {
          swappedAtoms = snapshotSwappedEstimate
          consumedAtomsForAverage = consumedAtoms
          setCachedSwappedEstimate(estimateCacheKey, {
            amount: swappedAtoms,
            consumedAtoms,
            source: 'snapshot',
          })
        }
      }
    }

    const cachedMetrics = getCachedSwappedEstimate(estimateCacheKey)
    if (cachedMetrics !== null && swappedAtoms < cachedMetrics.amount) {
      swappedAtoms = cachedMetrics.amount
      consumedAtomsForAverage = cachedMetrics.consumedAtoms
    }

    const cachedSource = getCachedSwappedEstimate(estimateCacheKey)?.source
    setCachedSwappedEstimate(estimateCacheKey, {
      amount: swappedAtoms,
      consumedAtoms: consumedAtomsForAverage,
      source: cachedSource ?? (hasPositionEnded ? 'snapshot' : 'active'),
    })
  }

  const claimableSwappedAtoms =
    swappedAtoms === null
      ? null
      : swappedAtoms > position.withdrawnAmount
        ? swappedAtoms - position.withdrawnAmount
        : 0n

  const averagePrice = (() => {
    if (swappedAtoms === null) return null
    const quoteAtoms = isBuy ? consumedAtomsForAverage : swappedAtoms
    const baseAtoms = isBuy ? swappedAtoms : consumedAtomsForAverage
    return computeAveragePrice(
      quoteAtoms,
      quoteDecimals,
      baseAtoms,
      baseDecimals,
    )
  })()

  return {
    amountAtoms,
    averagePrice,
    claimableSwappedAtoms,
    consumedAtoms,
    depositedDecimals,
    depositedToken,
    flowAtomsPerSlot: flowAtomsPerSlot > 0n ? flowAtomsPerSlot : 0n,
    flowLabel,
    hasPositionEnded,
    isPaused,
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
