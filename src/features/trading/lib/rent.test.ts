import { describe, expect, it } from 'vitest'
import { ARRAY_LENGTH } from '../constants'
import {
  collectCloseableRentAccountPairs,
  isRentAccountIndexStale,
} from './rent'
import type { Address } from '@solana/kit'

function asAddress(value: string) {
  return value as Address
}

describe('rent eligibility', () => {
  it('closes a pair only after the full prices/exits account horizon', () => {
    const index = 3n
    const endSlotInterval = 5n
    const closableAfterSlot =
      (index + 1n) * BigInt(ARRAY_LENGTH) * endSlotInterval

    expect(
      isRentAccountIndexStale({
        currentSlot: closableAfterSlot,
        endSlotInterval,
        index,
      }),
    ).toBe(false)

    expect(
      isRentAccountIndexStale({
        currentSlot: closableAfterSlot + 1n,
        endSlotInterval,
        index,
      }),
    ).toBe(true)
  })

  it('collects matching pairs and caps them by their two-account cost', () => {
    const market = asAddress('market')
    const payer = asAddress('payer')
    const pairs = collectCloseableRentAccountPairs({
      currentSlot: 10_000n,
      endSlotInterval: 5n,
      exitsAccounts: [
        {
          address: asAddress('exits-0'),
          index: 0n,
          lamports: 1_000_000n,
          market,
          openPositions: 0,
          payer,
        },
        {
          address: asAddress('exits-1'),
          index: 1n,
          lamports: 3_000_000n,
          market,
          openPositions: 0,
          payer,
        },
      ],
      market,
      maxAccounts: 3,
      payer,
      pricesAccounts: [
        {
          address: asAddress('prices-0'),
          index: 0n,
          lamports: 2_000_000n,
          market,
          payer,
        },
        {
          address: asAddress('prices-1'),
          index: 1n,
          lamports: 4_000_000n,
          market,
          payer,
        },
      ],
    })

    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toMatchObject({
      exits: { address: asAddress('exits-0') },
      index: 0n,
      prices: { address: asAddress('prices-0') },
    })
  })

  it('requires a zero-position exits account with the selected market and payer', () => {
    const market = asAddress('selected-market')
    const payer = asAddress('selected-payer')
    const otherMarket = asAddress('other-market')
    const otherPayer = asAddress('other-payer')
    const pairs = collectCloseableRentAccountPairs({
      currentSlot: 10_000n,
      endSlotInterval: 5n,
      exitsAccounts: [
        {
          address: asAddress('open-exits'),
          index: 0n,
          lamports: 1n,
          market,
          openPositions: 1,
          payer,
        },
        {
          address: asAddress('wrong-market-exits'),
          index: 1n,
          lamports: 1n,
          market: otherMarket,
          openPositions: 0,
          payer,
        },
        {
          address: asAddress('wrong-payer-exits'),
          index: 2n,
          lamports: 1n,
          market,
          openPositions: 0,
          payer: otherPayer,
        },
        {
          address: asAddress('unpaired-exits'),
          index: 3n,
          lamports: 1n,
          market,
          openPositions: 0,
          payer,
        },
      ],
      market,
      maxAccounts: 10,
      payer,
      pricesAccounts: [
        {
          address: asAddress('prices-0'),
          index: 0n,
          lamports: 1n,
          market,
          payer,
        },
        {
          address: asAddress('prices-1'),
          index: 1n,
          lamports: 1n,
          market: otherMarket,
          payer,
        },
        {
          address: asAddress('prices-2'),
          index: 2n,
          lamports: 1n,
          market,
          payer: otherPayer,
        },
      ],
    })

    expect(pairs).toEqual([])
  })
})
