import { describe, expect, it } from 'vitest'
import { buildClosedPositionSummary } from './closed-position'

describe('buildClosedPositionSummary', () => {
  it('derives a buy-side fill summary from close events', () => {
    const summary = buildClosedPositionSummary({
      baseDecimals: 9,
      baseTicker: 'BTC',
      event: {
        created_at: '2026-03-20T00:00:00Z',
        deposit_amount: 2_000_000_000n,
        end_slot: 120,
        fee_amount: 50_000_000n,
        id: 1,
        is_buy: 1,
        market_id: 1,
        position_authority: 'wallet',
        remaining_amount: 500_000_000n,
        signature: 'sig',
        slot: 123,
        start_slot: 100,
        swapped_amount: 750_000_000n,
      },
      quoteDecimals: 9,
      quoteTicker: 'USDC',
    })

    expect(summary.sideLabel).toBe('Buy')
    expect(summary.depositToken).toBe('USDC')
    expect(summary.swappedToken).toBe('BTC')
    expect(summary.consumedAtoms).toBe(1_500_000_000n)
    expect(summary.receivedAtoms).toBe(700_000_000n)
    expect(summary.averageFillPrice).toBeCloseTo(2, 8)
  })
})
