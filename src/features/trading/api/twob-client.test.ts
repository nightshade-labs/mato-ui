import { describe, expect, it } from 'vitest'
import {
  deriveAssociatedTokenAddress,
  deriveMarketAddress,
  deriveTemporaryWithdrawTokenAddress,
  fetchMarketTradePositions,
  fetchTradePositions,
  getApprovalSafeReferenceIndex,
  getReferenceIndex,
  getSwappedPositionAsset,
  getUnpausedEndSlot,
} from './twob-client'
import type { TwobRpcClient } from './twob-client'
import type { Address } from '@solana/kit'
import { getTradePositionEncoder } from '@/lib/generated/twob/src/generated/accounts'
import { Side } from '@/lib/generated/twob/src/generated/types'

const BASE_MINT = 'So11111111111111111111111111111111111111112' as Address
const QUOTE_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address
const BASE_RECEIVER = '11111111111111111111111111111111' as Address
const QUOTE_RECEIVER = 'CCAd78ZgUBAFNQmCCD5z4oGuFzb8uXLw5kfnBcRvDw16' as Address
const LEGACY_TOKEN_PROGRAM =
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address
const TOKEN_2022_PROGRAM =
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as Address

type ProgramAccountsConfig = NonNullable<
  Parameters<TwobRpcClient['getProgramAccounts']>[1]
>

function encodeTradePosition(marketId: number, id: number) {
  const bytes = getTradePositionEncoder().encode({
    amount: 100n,
    authority: BASE_RECEIVER,
    baseReceiver: BASE_RECEIVER,
    bookkeepingSnapshot: 0n,
    bump: 0,
    flow: 10n,
    id,
    inactiveRefund: 0n,
    lastUpdateSlot: 1n,
    marketId,
    operator: BASE_RECEIVER,
    pausedAtSlot: 0n,
    payer: BASE_RECEIVER,
    quoteReceiver: QUOTE_RECEIVER,
    remainingSlots: 10,
    side: Side.Buy,
    slotsWithoutTradesSnapshot: 0,
    startSlot: 1n,
    swappedAmountAtSnapshot: 0n,
    withdrawnAmount: 0n,
  })

  return Buffer.from(bytes).toString('base64')
}

function createProgramAccountsRpc(
  accounts: Array<{
    account: { data: [string, 'base64'] }
    pubkey: Address
  }> = [],
) {
  let config: ProgramAccountsConfig | null = null
  const rpc = {
    getProgramAccounts: (
      _programAddress: Address,
      nextConfig: ProgramAccountsConfig,
    ) => {
      config = nextConfig
      return { send: () => Promise.resolve(accounts) }
    },
  } as unknown as TwobRpcClient

  return { getConfig: () => config, rpc }
}

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

  it('adds the little-endian market id filter to authority scans', async () => {
    const { getConfig, rpc } = createProgramAccountsRpc()

    await fetchTradePositions(rpc, BASE_RECEIVER, 4)

    expect(getConfig()?.filters).toContainEqual({
      memcmp: {
        bytes: BASE_RECEIVER,
        encoding: 'base58',
        offset: 8n,
      },
    })
    expect(getConfig()?.filters).toContainEqual({
      memcmp: {
        bytes: '6vx8P',
        encoding: 'base58',
        offset: 268n,
      },
    })
  })

  it('filters order-book scans on the server and after decoding', async () => {
    const { getConfig, rpc } = createProgramAccountsRpc([
      {
        account: { data: [encodeTradePosition(4, 1), 'base64'] },
        pubkey: BASE_RECEIVER,
      },
      {
        account: { data: [encodeTradePosition(3, 2), 'base64'] },
        pubkey: QUOTE_RECEIVER,
      },
    ])

    const positions = await fetchMarketTradePositions(rpc, 4)

    expect(getConfig()?.filters).toContainEqual({
      memcmp: {
        bytes: '6vx8P',
        encoding: 'base58',
        offset: 268n,
      },
    })
    expect(positions.map((position) => position.data.marketId)).toEqual([4])
  })

  it('uses the next interval account when bookkeeping is current', () => {
    expect(getApprovalSafeReferenceIndex(5_000, 4_900n, 107)).toBe(3n)
  })

  it('keeps the current account when bookkeeping is still in the previous window', () => {
    expect(getApprovalSafeReferenceIndex(5_000, 4_200n, 107)).toBe(2n)
  })

  it('advances at the account boundary', () => {
    expect(getApprovalSafeReferenceIndex(6_420, 6_420n, 107)).toBe(4n)
  })
})
