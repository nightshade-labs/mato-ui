import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Address } from '@solana/kit'
import type { TradePosition } from '@/lib/generated/twob/src/generated/accounts'
import type { StreamingMarketState } from '../domain/models'
import { Side } from '@/lib/generated/twob/src/generated/types'

class SessionStorageMock {
  private readonly store = new Map<string, string>()

  clear() {
    this.store.clear()
  }

  getItem(key: string) {
    return this.store.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  setItem(key: string, value: string) {
    this.store.set(key, value)
  }

  get length() {
    return this.store.size
  }
}

function createPosition(overrides: Partial<TradePosition> = {}): TradePosition {
  return {
    amount: 100n,
    authority: 'authority1111111111111111111111111111111111' as Address,
    baseReceiver: 'baseReceiver111111111111111111111111111111' as Address,
    bookkeepingSnapshot: 0n,
    bump: 0,
    discriminator: new Uint8Array(8),
    flow: 10_000_000_000n,
    id: 42,
    inactiveRefund: 0n,
    lastUpdateSlot: 0n,
    marketId: 1,
    operator: 'operator111111111111111111111111111111111' as Address,
    pausedAtSlot: 0n,
    payer: 'payer1111111111111111111111111111111111111' as Address,
    quoteReceiver: 'quoteReceiver11111111111111111111111111111' as Address,
    remainingSlots: 10,
    side: Side.Buy,
    slotsWithoutTradesSnapshot: 0,
    startSlot: 0n,
    swappedAmountAtSnapshot: 0n,
    withdrawnAmount: 0n,
    ...overrides,
  }
}

function createStreamingState(
  currentSlot: number,
  bookkeepingBasePerQuote: bigint,
): StreamingMarketState {
  return {
    bookkeepingBasePerQuote,
    bookkeepingLastUpdateSlot: currentSlot,
    bookkeepingQuotePerBase: 0n,
    currentSlot,
    endSlotInterval: 5,
    marketBaseFlow: 1n,
    marketQuoteFlow: 1n,
  }
}

describe('getActivePositionMetrics', () => {
  afterEach(() => {
    vi.resetModules()
    delete (globalThis as unknown as { sessionStorage?: Storage })
      .sessionStorage
  })

  it('keeps the projected terminal swapped amount stable across module reloads', async () => {
    ;(globalThis as unknown as { sessionStorage?: Storage }).sessionStorage =
      new SessionStorageMock() as unknown as Storage

    const firstModule = await import('./position-progress')
    firstModule.getActivePositionMetrics({
      baseDecimals: 0,
      baseTicker: 'SOL',
      endSlotBookkeepingSnapshot: null,
      market: 'market111111111111111111111111111111111111' as Address,
      position: createPosition(),
      quoteDecimals: 0,
      quoteTicker: 'USDC',
      streamingState: createStreamingState(9, 9_000_000_000_000_000n),
    })

    vi.resetModules()

    const reloadedModule = await import('./position-progress')
    const metrics = reloadedModule.getActivePositionMetrics({
      baseDecimals: 0,
      baseTicker: 'SOL',
      endSlotBookkeepingSnapshot: null,
      market: 'market111111111111111111111111111111111111' as Address,
      position: createPosition(),
      quoteDecimals: 0,
      quoteTicker: 'USDC',
      streamingState: createStreamingState(20, 20_000_000_000_000_000n),
    })

    expect(metrics.hasPositionEnded).toBe(true)
    expect(metrics.swappedAtoms).toBe(100n)
  })

  it('freezes a paused position and keeps its snapshotted funds withdrawable', async () => {
    const { getActivePositionMetrics } = await import('./position-progress')
    const position = createPosition({
      lastUpdateSlot: 5n,
      pausedAtSlot: 5n,
      remainingSlots: 5,
      swappedAmountAtSnapshot: 40n,
      withdrawnAmount: 10n,
    })
    const input = {
      baseDecimals: 0,
      baseTicker: 'SOL',
      endSlotBookkeepingSnapshot: null,
      market: 'market111111111111111111111111111111111111' as Address,
      position,
      quoteDecimals: 0,
      quoteTicker: 'USDC',
    }

    const first = getActivePositionMetrics({
      ...input,
      streamingState: createStreamingState(20, 20_000_000_000_000_000n),
    })
    const later = getActivePositionMetrics({
      ...input,
      streamingState: createStreamingState(100, 100_000_000_000_000_000n),
    })

    expect(first).toMatchObject({
      claimableSwappedAtoms: 30n,
      hasPositionEnded: false,
      isPaused: true,
      progressPercent: 50,
      remainingAtoms: 50n,
      swappedAtoms: 40n,
    })
    expect(later).toMatchObject({
      claimableSwappedAtoms: 30n,
      hasPositionEnded: false,
      progressPercent: 50,
      remainingAtoms: 50n,
      swappedAtoms: 40n,
    })
  })

  it('adds live accrual to the snapshotted swapped total', async () => {
    const { getActivePositionMetrics } = await import('./position-progress')
    const metrics = getActivePositionMetrics({
      baseDecimals: 0,
      baseTicker: 'SOL',
      endSlotBookkeepingSnapshot: null,
      market: 'market111111111111111111111111111111111111' as Address,
      position: createPosition({
        swappedAmountAtSnapshot: 20n,
        withdrawnAmount: 15n,
      }),
      quoteDecimals: 0,
      quoteTicker: 'USDC',
      streamingState: createStreamingState(2, 2_000_000_000_000_000n),
    })

    expect(metrics.swappedAtoms).toBe(40n)
    expect(metrics.claimableSwappedAtoms).toBe(25n)
  })

  it('makes only newly accrued funds claimable after a withdrawal', async () => {
    const { getActivePositionMetrics } = await import('./position-progress')
    const metrics = getActivePositionMetrics({
      baseDecimals: 0,
      baseTicker: 'SOL',
      endSlotBookkeepingSnapshot: null,
      market: 'market111111111111111111111111111111111111' as Address,
      position: createPosition({
        bookkeepingSnapshot: 2_000_000_000_000_000n,
        swappedAmountAtSnapshot: 20n,
        withdrawnAmount: 20n,
      }),
      quoteDecimals: 0,
      quoteTicker: 'USDC',
      streamingState: createStreamingState(3, 3_000_000_000_000_000n),
    })

    expect(metrics.swappedAtoms).toBe(30n)
    expect(metrics.claimableSwappedAtoms).toBe(10n)
  })

  it('does not carry a pre-withdraw estimate into the updated snapshot', async () => {
    const { getActivePositionMetrics } = await import('./position-progress')
    const input = {
      baseDecimals: 0,
      baseTicker: 'SOL',
      endSlotBookkeepingSnapshot: null,
      market: 'market111111111111111111111111111111111111' as Address,
      quoteDecimals: 0,
      quoteTicker: 'USDC',
    }

    const beforeWithdrawal = getActivePositionMetrics({
      ...input,
      position: createPosition(),
      streamingState: createStreamingState(9, 10_000_000_000_000_000n),
    })
    const afterWithdrawal = getActivePositionMetrics({
      ...input,
      position: createPosition({
        bookkeepingSnapshot: 9_000_000_000_000_000n,
        swappedAmountAtSnapshot: 90n,
        withdrawnAmount: 90n,
      }),
      streamingState: createStreamingState(9, 9_000_000_000_000_000n),
    })

    expect(beforeWithdrawal.claimableSwappedAtoms).toBe(100n)
    expect(afterWithdrawal.claimableSwappedAtoms).toBe(0n)
  })

  it('matches the program truncation order for small fractional flows', async () => {
    const { getActivePositionMetrics } = await import('./position-progress')
    const metrics = getActivePositionMetrics({
      baseDecimals: 0,
      baseTicker: 'SOL',
      endSlotBookkeepingSnapshot: null,
      market: 'market111111111111111111111111111111111111' as Address,
      position: createPosition({ flow: 19_999n }),
      quoteDecimals: 0,
      quoteTicker: 'USDC',
      streamingState: createStreamingState(1, 60_000_000_000_000_000_000n),
    })

    expect(metrics.swappedAtoms).toBe(0n)
  })
})
