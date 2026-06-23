import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Address } from '@solana/kit'
import type { TradePosition } from '@/lib/generated/twob/src/generated/accounts'
import type { StreamingMarketState } from '../domain/models'

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

function createPosition(): TradePosition {
  return {
    amount: 100n,
    authority: 'authority1111111111111111111111111111111111' as Address,
    bookkeepingSnapshot: 0n,
    bump: 0,
    discriminator: new Uint8Array(8),
    endSlot: 10n,
    id: 42n,
    isBuy: 1,
    slotsWithoutTradesSnapshot: 0n,
    startSlot: 0n,
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
})
