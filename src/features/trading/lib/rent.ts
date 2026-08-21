import {
  ARRAY_LENGTH,
  MAX_RECLAIM_RENT_ACCOUNTS_PER_TRANSACTION,
} from '../constants'
import type { Address } from '@solana/kit'

export type ExitsRentAccount = {
  address: Address
  index: bigint
  lamports: bigint
  market: Address
  openPositions: number
  payer: Address
}

export type PricesRentAccount = {
  address: Address
  index: bigint
  lamports: bigint
  market: Address
  payer: Address
}

export type CloseableRentAccountPair = {
  exits: ExitsRentAccount
  index: bigint
  prices: PricesRentAccount
}

function toBigInt(value: bigint | number) {
  return typeof value === 'bigint' ? value : BigInt(Math.floor(value))
}

function getClosableAfterSlot(index: bigint, endSlotInterval: bigint) {
  return (index + 1n) * BigInt(ARRAY_LENGTH) * endSlotInterval
}

export function isRentAccountIndexStale({
  currentSlot,
  endSlotInterval,
  index,
}: {
  currentSlot: bigint | number
  endSlotInterval: bigint | number
  index: bigint
}) {
  return (
    toBigInt(currentSlot) >
    getClosableAfterSlot(index, toBigInt(endSlotInterval))
  )
}

export function collectCloseableRentAccountPairs({
  currentSlot,
  endSlotInterval,
  exitsAccounts,
  market,
  maxAccounts = MAX_RECLAIM_RENT_ACCOUNTS_PER_TRANSACTION,
  payer,
  pricesAccounts,
}: {
  currentSlot: bigint | number
  endSlotInterval: bigint | number
  exitsAccounts: Array<ExitsRentAccount>
  market: Address
  maxAccounts?: number
  payer: Address
  pricesAccounts: Array<PricesRentAccount>
}): Array<CloseableRentAccountPair> {
  const matchingPricesByIndex = new Map(
    pricesAccounts
      .filter((account) => account.market === market && account.payer === payer)
      .map((account) => [account.index, account] as const),
  )
  const maxPairs = Math.max(0, Math.floor(maxAccounts / 2))

  return exitsAccounts
    .filter(
      (account) =>
        account.market === market &&
        account.payer === payer &&
        account.openPositions === 0 &&
        isRentAccountIndexStale({
          currentSlot,
          endSlotInterval,
          index: account.index,
        }),
    )
    .flatMap((exits) => {
      const prices = matchingPricesByIndex.get(exits.index)
      return prices ? [{ exits, index: exits.index, prices }] : []
    })
    .sort((left, right) => {
      if (left.index === right.index) return 0
      return left.index < right.index ? -1 : 1
    })
    .slice(0, maxPairs)
}
