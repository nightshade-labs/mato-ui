import type { Address } from '@solana/kit'
import {
  ARRAY_LENGTH,
  MAX_RECLAIM_RENT_ACCOUNTS_PER_TRANSACTION,
} from '../constants'

export type ExitsRentAccount = {
  address: Address
  index: bigint
}

export type PricesRentAccount = {
  address: Address
  index: bigint
  openPositions: bigint
}

export type RentAccountToClose =
  | {
      address: Address
      index: bigint
      kind: 'exits'
    }
  | {
      address: Address
      index: bigint
      kind: 'prices'
      openPositions: bigint
    }

function toBigInt(value: bigint | number) {
  return typeof value === 'bigint' ? value : BigInt(Math.floor(value))
}

function getClosableAfterSlot(index: bigint, endSlotInterval: bigint) {
  return (index + 1n) * BigInt(ARRAY_LENGTH) * endSlotInterval
}

export function isExitsAccountCloseable({
  currentSlot,
  endSlotInterval,
  index,
}: {
  currentSlot: bigint | number
  endSlotInterval: bigint | number
  index: bigint
}) {
  return (
    toBigInt(currentSlot) > getClosableAfterSlot(index, toBigInt(endSlotInterval))
  )
}

export function isPricesAccountCloseable({
  currentSlot,
  endSlotInterval,
  index,
  openPositions,
}: {
  currentSlot: bigint | number
  endSlotInterval: bigint | number
  index: bigint
  openPositions: bigint
}) {
  return (
    openPositions === 0n &&
    isExitsAccountCloseable({ currentSlot, endSlotInterval, index })
  )
}

export function collectCloseableRentAccounts({
  currentSlot,
  endSlotInterval,
  exitsAccounts,
  maxAccounts = MAX_RECLAIM_RENT_ACCOUNTS_PER_TRANSACTION,
  pricesAccounts,
}: {
  currentSlot: bigint | number
  endSlotInterval: bigint | number
  exitsAccounts: ExitsRentAccount[]
  maxAccounts?: number
  pricesAccounts: PricesRentAccount[]
}): RentAccountToClose[] {
  const closeableExits: RentAccountToClose[] = exitsAccounts
    .filter((account) =>
      isExitsAccountCloseable({
        currentSlot,
        endSlotInterval,
        index: account.index,
      }),
    )
    .map((account) => ({
      address: account.address,
      index: account.index,
      kind: 'exits' as const,
    }))

  const closeablePrices: RentAccountToClose[] = pricesAccounts
    .filter((account) =>
      isPricesAccountCloseable({
        currentSlot,
        endSlotInterval,
        index: account.index,
        openPositions: account.openPositions,
      }),
    )
    .map((account) => ({
      address: account.address,
      index: account.index,
      kind: 'prices' as const,
      openPositions: account.openPositions,
    }))

  return [...closeableExits, ...closeablePrices]
    .sort((left, right) => {
      if (left.index === right.index) {
        if (left.kind === right.kind) return 0
        return left.kind === 'exits' ? -1 : 1
      }

      return left.index < right.index ? -1 : 1
    })
    .slice(0, Math.max(0, Math.floor(maxAccounts)))
}
