import { describe, expect, it } from 'vitest'
import {
  deriveAssociatedTokenAddress,
  deriveMarketAddress,
  deriveTemporaryWithdrawTokenAddress,
  getReferenceIndex,
  getSwappedPositionAsset,
  getUnpausedEndSlot,
} from './twob-client'
import type { Address } from '@solana/kit'
import { Side } from '@/lib/generated/twob/src/generated/types'

const BASE_MINT = 'So11111111111111111111111111111111111111112' as Address
const QUOTE_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address
const BASE_RECEIVER = '11111111111111111111111111111111' as Address
const QUOTE_RECEIVER = 'CCAd78ZgUBAFNQmCCD5z4oGuFzb8uXLw5kfnBcRvDw16' as Address
const LEGACY_TOKEN_PROGRAM =
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address
const TOKEN_2022_PROGRAM =
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as Address

describe('twob v1 client helpers', () => {
  it('derives the deployed market 1 PDA with a u32 seed', async () => {
    await expect(deriveMarketAddress(1)).resolves.toBe(
      'BMMWpvb3PtMCnWa3uh9ChS2UWufiLLFTV6tkrCJ6DUng',
    )
  })

  it('keeps reference index zero reserved', () => {
    expect(getReferenceIndex(0, 107)).toBe(1n)
  })

  it('always rounds a resumed position to the next end-slot interval', () => {
    expect(getUnpausedEndSlot(189, 10, 10)).toBe(200n)
    expect(getUnpausedEndSlot(190, 10, 10)).toBe(210n)
    expect(getUnpausedEndSlot(191, 10, 10)).toBe(210n)
  })

  it('includes the token program when deriving an associated token account', async () => {
    const legacyAddress = await deriveAssociatedTokenAddress({
      mint: BASE_MINT,
      owner: BASE_RECEIVER,
      tokenProgram: LEGACY_TOKEN_PROGRAM,
    })
    const token2022Address = await deriveAssociatedTokenAddress({
      mint: BASE_MINT,
      owner: BASE_RECEIVER,
      tokenProgram: TOKEN_2022_PROGRAM,
    })

    expect(token2022Address).not.toBe(legacyAddress)
  })

  it('uses a program-owned temporary token account for native withdrawals', async () => {
    const tradePosition =
      'BMMWpvb3PtMCnWa3uh9ChS2UWufiLLFTV6tkrCJ6DUng' as Address
    const [temporaryAddress, associatedAddress] = await Promise.all([
      deriveTemporaryWithdrawTokenAddress(tradePosition),
      deriveAssociatedTokenAddress({
        mint: BASE_MINT,
        owner: BASE_RECEIVER,
        tokenProgram: LEGACY_TOKEN_PROGRAM,
      }),
    ])

    expect(temporaryAddress).not.toBe(associatedAddress)
  })

  it('routes swapped funds to the side-specific mint and receiver', () => {
    const market = { baseMint: BASE_MINT, quoteMint: QUOTE_MINT }
    const receivers = {
      baseReceiver: BASE_RECEIVER,
      quoteReceiver: QUOTE_RECEIVER,
    }

    expect(
      getSwappedPositionAsset(market, { ...receivers, side: Side.Buy }),
    ).toEqual({ mint: BASE_MINT, receiver: BASE_RECEIVER })
    expect(
      getSwappedPositionAsset(market, { ...receivers, side: Side.Sell }),
    ).toEqual({ mint: QUOTE_MINT, receiver: QUOTE_RECEIVER })
  })
})
