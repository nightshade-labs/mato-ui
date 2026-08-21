import { describe, expect, it } from 'vitest'
import {
  buildChartPositionSlotRanges,
  estimateTimeMsForSlot,
} from './chart-positions'
import type { Address } from '@solana/kit'
import type { ClosePositionEvent } from '@/integrations/read-api'
import type { TradePositionRecord } from '../domain/models'
import { Side } from '@/lib/generated/twob/src/generated/types'

function activePosition({
  endSlot,
  startSlot,
}: {
  endSlot: bigint
  startSlot: bigint
}): TradePositionRecord {
  return {
    address: '11111111111111111111111111111111' as Address,
    data: {
      discriminator: new Uint8Array(),
      amount: 1_000_000n,
      authority: '22222222222222222222222222222222' as Address,
      baseReceiver: '33333333333333333333333333333333' as Address,
      bookkeepingSnapshot: 0n,
      bump: 255,
      flow: 0n,
      id: 1,
      inactiveRefund: 0n,
      lastUpdateSlot: startSlot,
      marketId: 1,
      operator: '44444444444444444444444444444444' as Address,
      pausedAtSlot: 0n,
      payer: '55555555555555555555555555555555' as Address,
      quoteReceiver: '66666666666666666666666666666666' as Address,
      remainingSlots: Number(endSlot - startSlot),
      side: Side.Buy,
      slotsWithoutTradesSnapshot: 0,
      startSlot,
      swappedAmountAtSnapshot: 0n,
      withdrawnAmount: 0n,
    },
  }
}

function closedPosition({
  endSlot,
  slot,
  startSlot,
}: {
  endSlot: number | null
  slot: number
  startSlot: number | null
}): ClosePositionEvent {
  return {
    created_at: '2026-06-05T12:00:00.000Z',
    deposit_amount: 1_000_000n,
    end_slot: endSlot,
    fee_amount: 0n,
    id: 1,
    is_buy: 1,
    market_id: 1,
    position_authority: 'authority',
    remaining_amount: 0n,
    signature: 'signature',
    slot,
    start_slot: startSlot,
    swapped_amount: 1_000_000n,
  }
}

describe('estimateTimeMsForSlot', () => {
  it('interpolates missing slots from surrounding market update anchors', () => {
    expect(
      estimateTimeMsForSlot(
        [
          { slot: 100, timeMs: 10_000 },
          { slot: 200, timeMs: 50_000 },
        ],
        150,
      ),
    ).toBe(30_000)
  })

  it('extrapolates outside the known anchor range', () => {
    expect(
      estimateTimeMsForSlot(
        [
          { slot: 100, timeMs: 10_000 },
          { slot: 200, timeMs: 50_000 },
        ],
        250,
      ),
    ).toBe(70_000)
  })

  it('falls back to the default slot duration when only one anchor is known', () => {
    expect(estimateTimeMsForSlot([{ slot: 100, timeMs: 10_000 }], 105)).toBe(
      12_000,
    )
  })
})

describe('buildChartPositionSlotRanges', () => {
  it('uses the current slot for active positions that are still streaming', () => {
    expect(
      buildChartPositionSlotRanges({
        activePositions: [activePosition({ endSlot: 300n, startSlot: 100n })],
        closedPositions: [],
        currentSlot: 180,
      }),
    ).toEqual([{ endSlot: 180, startSlot: 100 }])
  })

  it('uses the close slot for closed positions that were closed early', () => {
    expect(
      buildChartPositionSlotRanges({
        activePositions: [],
        closedPositions: [
          closedPosition({ endSlot: 300, slot: 240, startSlot: 100 }),
        ],
        currentSlot: null,
      }),
    ).toEqual([{ endSlot: 240, startSlot: 100 }])
  })
})
