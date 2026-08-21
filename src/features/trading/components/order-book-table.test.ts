import { describe, expect, it } from 'vitest'
import { isVisibleOrderBookPosition } from './order-book-table'
import type { Address } from '@solana/kit'
import type { TradePositionRecord } from '../domain/models'
import { Side } from '@/lib/generated/twob/src/generated/types'

function position(pausedAtSlot = 0n): TradePositionRecord {
  return {
    address: '11111111111111111111111111111111' as Address,
    data: {
      amount: 100n,
      authority: '11111111111111111111111111111111' as Address,
      baseReceiver: '11111111111111111111111111111111' as Address,
      bookkeepingSnapshot: 0n,
      bump: 255,
      discriminator: new Uint8Array(8),
      flow: 10_000_000_000n,
      id: 1,
      inactiveRefund: 0n,
      lastUpdateSlot: 0n,
      marketId: 1,
      operator: '11111111111111111111111111111111' as Address,
      pausedAtSlot,
      payer: '11111111111111111111111111111111' as Address,
      quoteReceiver: '11111111111111111111111111111111' as Address,
      remainingSlots: 10,
      side: Side.Buy,
      slotsWithoutTradesSnapshot: 0,
      startSlot: 0n,
      swappedAmountAtSnapshot: 0n,
      withdrawnAmount: 0n,
    },
  }
}

describe('isVisibleOrderBookPosition', () => {
  it('keeps a streaming position visible through its end slot', () => {
    expect(isVisibleOrderBookPosition(position(), 10)).toBe(true)
    expect(isVisibleOrderBookPosition(position(), 11)).toBe(false)
  })

  it('hides a paused position because its flow is removed from the market', () => {
    expect(isVisibleOrderBookPosition(position(5n), 6)).toBe(false)
  })
})
