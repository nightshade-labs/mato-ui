import type { Address } from '@solana/kit'
import {
  getExitsDecoder,
  getExitsDiscriminatorBytes,
  getPricesDecoder,
  getPricesDiscriminatorBytes,
  type Exits,
  type Prices,
} from '@/lib/generated/twob/src/generated/accounts'
import { TWOB_ANCHOR_PROGRAM_ADDRESS } from '@/lib/generated/twob/src/generated/programs'
import { decodeBase64 } from '../lib/bytes'
import { encodeBase58 } from '../lib/base58'
import type { TwobRpcClient } from './twob-client'

type ProgramAccountResponse = {
  account: { data: [string, string] }
  pubkey: Address
}

type ProgramAccountsResponse = ProgramAccountResponse[] | {
  value: ProgramAccountResponse[]
}

function asProgramAccounts(response: ProgramAccountsResponse) {
  return Array.isArray(response) ? response : response.value
}

export type OwnedPricesAccount = {
  address: Address
  data: Prices
}

export type OwnedExitsAccount = {
  address: Address
  data: Exits
}

export async function fetchOwnedPricesAccounts(
  rpcClient: TwobRpcClient,
  owner: string,
): Promise<OwnedPricesAccount[]> {
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
            bytes: owner as never,
            encoding: 'base58',
            offset: 8n,
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
    }))
    .sort((left, right) => {
      if (left.data.index === right.data.index) return 0
      return left.data.index > right.data.index ? -1 : 1
    })
}

export async function fetchOwnedExitsAccounts(
  rpcClient: TwobRpcClient,
  owner: string,
): Promise<OwnedExitsAccount[]> {
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
            bytes: owner as never,
            encoding: 'base58',
            offset: 8n,
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
    }))
    .sort((left, right) => {
      if (left.data.index === right.data.index) return 0
      return left.data.index > right.data.index ? -1 : 1
    })
}
