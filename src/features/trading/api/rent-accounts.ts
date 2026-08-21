import { decodeBase64 } from '../lib/bytes'
import { encodeBase58 } from '../lib/base58'
import type { Address } from '@solana/kit'
import type { TwobRpcClient } from './twob-client'
import type { Exits, Prices } from '@/lib/generated/twob/src/generated/accounts'
import {
  getExitsDecoder,
  getExitsDiscriminatorBytes,
  getPricesDecoder,
  getPricesDiscriminatorBytes,
} from '@/lib/generated/twob/src/generated/accounts'
import { TWOB_ANCHOR_PROGRAM_ADDRESS } from '@/lib/generated/twob/src/generated/programs'

type ProgramAccountResponse = {
  account: { data: [string, string]; lamports: bigint | number | string }
  pubkey: Address
}

type ProgramAccountsResponse =
  | Array<ProgramAccountResponse>
  | {
      value: Array<ProgramAccountResponse>
    }

function asProgramAccounts(response: ProgramAccountsResponse) {
  return Array.isArray(response) ? response : response.value
}

function toLamports(value: bigint | number | string) {
  return typeof value === 'bigint' ? value : BigInt(value)
}

export type OwnedPricesAccount = {
  address: Address
  data: Prices
  lamports: bigint
}

export type OwnedExitsAccount = {
  address: Address
  data: Exits
  lamports: bigint
}

export async function fetchOwnedPricesAccounts(
  rpcClient: TwobRpcClient,
  payer: string,
): Promise<Array<OwnedPricesAccount>> {
  const response = (await rpcClient
    .getProgramAccounts(TWOB_ANCHOR_PROGRAM_ADDRESS, {
      commitment: 'confirmed',
      encoding: 'base64',
      filters: [
        {
          memcmp: {
            bytes: encodeBase58(
              Uint8Array.from(getPricesDiscriminatorBytes()),
            ) as never,
            encoding: 'base58',
            offset: 0n,
          },
        },
        {
          memcmp: {
            bytes: payer as never,
            encoding: 'base58',
            offset: 48n,
          },
        },
      ],
    })
    .send()) as ProgramAccountsResponse

  const decoder = getPricesDecoder()
  return asProgramAccounts(response)
    .map(({ account, pubkey }) => ({
      address: pubkey,
      data: decoder.decode(decodeBase64(account.data[0])),
      lamports: toLamports(account.lamports),
    }))
    .sort((left, right) => {
      if (left.data.index === right.data.index) return 0
      return left.data.index > right.data.index ? -1 : 1
    })
}

export async function fetchOwnedExitsAccounts(
  rpcClient: TwobRpcClient,
  payer: string,
): Promise<Array<OwnedExitsAccount>> {
  const response = (await rpcClient
    .getProgramAccounts(TWOB_ANCHOR_PROGRAM_ADDRESS, {
      commitment: 'confirmed',
      encoding: 'base64',
      filters: [
        {
          memcmp: {
            bytes: encodeBase58(
              Uint8Array.from(getExitsDiscriminatorBytes()),
            ) as never,
            encoding: 'base58',
            offset: 0n,
          },
        },
        {
          memcmp: {
            bytes: payer as never,
            encoding: 'base58',
            offset: 48n,
          },
        },
      ],
    })
    .send()) as ProgramAccountsResponse

  const decoder = getExitsDecoder()
  return asProgramAccounts(response)
    .map(({ account, pubkey }) => ({
      address: pubkey,
      data: decoder.decode(decodeBase64(account.data[0])),
      lamports: toLamports(account.lamports),
    }))
    .sort((left, right) => {
      if (left.data.index === right.data.index) return 0
      return left.data.index > right.data.index ? -1 : 1
    })
}
