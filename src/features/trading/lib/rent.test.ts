import { describe, expect, it } from 'vitest'
import type { Address } from '@solana/kit'
import { ARRAY_LENGTH } from '../constants'
import {
  collectCloseableRentAccounts,
  isExitsAccountCloseable,
  isPricesAccountCloseable,
} from './rent'

function asAddress(value: string) {
  return value as Address
}

describe('rent eligibility', () => {
  it('closes exits only after the full prices/exits account horizon', () => {
    const index = 3n
    const endSlotInterval = 5n
    const closableAfterSlot =
      (index + 1n) * BigInt(ARRAY_LENGTH) * endSlotInterval

    expect(
      isExitsAccountCloseable({
        currentSlot: closableAfterSlot,
        endSlotInterval,
        index,
      }),
    ).toBe(false)

    expect(
      isExitsAccountCloseable({
        currentSlot: closableAfterSlot + 1n,
        endSlotInterval,
        index,
      }),
    ).toBe(true)
  })

  it('requires open positions to be zero before closing prices', () => {
    expect(
      isPricesAccountCloseable({
        currentSlot: 10_000n,
        endSlotInterval: 5n,
        index: 1n,
        openPositions: 1n,
      }),
    ).toBe(false)

    expect(
      isPricesAccountCloseable({
        currentSlot: 10_000n,
        endSlotInterval: 5n,
        index: 1n,
        openPositions: 0n,
      }),
    ).toBe(true)
  })

  it('collects and caps closeable accounts', () => {
    const accounts = collectCloseableRentAccounts({
      currentSlot: 10_000n,
      endSlotInterval: 5n,
      exitsAccounts: [
        {
          address: asAddress('11111111111111111111111111111111'),
          index: 0n,
          lamports: 1_000_000n,
        },
      ],
      maxAccounts: 1,
      pricesAccounts: [
        {
          address: asAddress('SysvarC1ock11111111111111111111111111111111'),
          index: 0n,
          lamports: 2_000_000n,
          openPositions: 0n,
        },
      ],
    })

    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.lamports).toBe(1_000_000n)
  })
})
