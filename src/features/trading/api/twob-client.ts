import {
  WRAPPED_SOL_MINT,
  confirmationMeetsCommitment,
  createWalletTransactionSigner,
  deriveConfirmationStatus,
  detectTokenProgram,
  normalizeSignature,
  SIGNATURE_STATUS_TIMEOUT_MS,
  type SolanaClient,
  type WalletSession,
} from '@solana/client'
import type { UseSendTransactionReturnType } from '@solana/react-hooks'
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getAddressEncoder,
  getBase58Decoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getU64Encoder,
  isTransactionMessageWithSingleSendingSigner,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  signTransactionMessageWithSigners,
  type Address,
} from '@solana/kit'
import {
  fetchBookkeeping,
  fetchMarket,
  fetchPrices,
  fetchTradePosition,
  getTradePositionDecoder,
  getTradePositionDiscriminatorBytes,
} from '@/lib/generated/twob/src/generated/accounts'
import {
  getAuthorityClosePositionInstructionAsync,
  getSubmitOrderInstructionAsync,
} from '@/lib/generated/twob/src/generated/instructions'
import { TWOB_ANCHOR_PROGRAM_ADDRESS } from '@/lib/generated/twob/src/generated/programs'
import { ARRAY_LENGTH } from '../constants'
import type { StreamingMarketState, TradePositionRecord } from '../domain/models'
import { encodeBase58 } from '../lib/base58'
import { decodeBase64 } from '../lib/bytes'

const textEncoder = new TextEncoder()
const BOOKKEEPING_DELAY_SLOTS = 20
const SIGNATURE_POLL_INTERVAL_MS = 1_000

export type TwobRpcClient = SolanaClient['runtime']['rpc']

type SendTransactionHelper = Pick<UseSendTransactionReturnType, 'send'>

function seed(value: string) {
  return getBytesEncoder().encode(textEncoder.encode(value))
}

async function waitForConfirmedSignature(
  rpcClient: TwobRpcClient,
  signature: string,
) {
  const normalizedSignature = normalizeSignature(signature)
  if (!normalizedSignature) {
    throw new Error('Invalid transaction signature returned by wallet.')
  }

  const startTime = Date.now()

  while (Date.now() - startTime < SIGNATURE_STATUS_TIMEOUT_MS) {
    const response = await rpcClient
      .getSignatureStatuses([normalizedSignature])
      .send()
    const status = response.value[0] ?? null

    if (status?.err) {
      throw new Error(`Transaction failed during confirmation: ${JSON.stringify(status.err)}`)
    }

    if (confirmationMeetsCommitment(deriveConfirmationStatus(status), 'confirmed')) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, SIGNATURE_POLL_INTERVAL_MS))
  }

  throw new Error('Transaction confirmation timed out.')
}

export async function deriveMarketAddress(marketId: bigint | number) {
  const [address] = await getProgramDerivedAddress({
    programAddress: TWOB_ANCHOR_PROGRAM_ADDRESS,
    seeds: [seed('market'), getU64Encoder().encode(BigInt(marketId))],
  })
  return address
}

export async function deriveBookkeepingAddress(marketAddress: Address) {
  const [address] = await getProgramDerivedAddress({
    programAddress: TWOB_ANCHOR_PROGRAM_ADDRESS,
    seeds: [seed('bookkeeping'), getAddressEncoder().encode(marketAddress)],
  })
  return address
}

export async function deriveExitsAddress(marketAddress: Address, index: bigint | number) {
  const [address] = await getProgramDerivedAddress({
    programAddress: TWOB_ANCHOR_PROGRAM_ADDRESS,
    seeds: [
      seed('exits'),
      getAddressEncoder().encode(marketAddress),
      getU64Encoder().encode(BigInt(index)),
    ],
  })
  return address
}

export async function derivePricesAddress(marketAddress: Address, index: bigint | number) {
  const [address] = await getProgramDerivedAddress({
    programAddress: TWOB_ANCHOR_PROGRAM_ADDRESS,
    seeds: [
      seed('prices'),
      getAddressEncoder().encode(marketAddress),
      getU64Encoder().encode(BigInt(index)),
    ],
  })
  return address
}

export function getReferenceIndex(currentSlot: number, endSlotInterval: bigint) {
  return BigInt(
    Math.floor(
      (currentSlot + BOOKKEEPING_DELAY_SLOTS) /
        (ARRAY_LENGTH * Number(endSlotInterval)),
    ),
  )
}

export function getPreviousIndex(referenceIndex: bigint) {
  return referenceIndex - 1n
}

export function getFutureIndex(endSlot: bigint, endSlotInterval: bigint) {
  return endSlot / BigInt(ARRAY_LENGTH) / endSlotInterval
}

export function alignEndSlot(
  currentSlot: number,
  durationSlots: number,
  endSlotInterval: bigint,
) {
  const interval = Number(endSlotInterval)
  return BigInt(
    Math.floor((currentSlot + durationSlots + interval / 2) / interval) * interval,
  )
}

export function resolveSnapshotLocation(slot: number, endSlotInterval: number) {
  if (!Number.isFinite(slot) || slot < 0) return null
  if (!Number.isFinite(endSlotInterval) || endSlotInterval <= 0) return null

  const slotsPerPricesAccount = ARRAY_LENGTH * endSlotInterval
  return {
    pricesAccountIndex: Math.floor(slot / slotsPerPricesAccount),
    snapshotIndex: Math.floor(slot / endSlotInterval) % ARRAY_LENGTH,
  }
}

export async function fetchStreamingMarketState(
  rpcClient: TwobRpcClient,
  marketAddress: Address,
): Promise<StreamingMarketState> {
  const bookkeepingAddress = await deriveBookkeepingAddress(marketAddress)
  const [currentSlot, marketAccount, bookkeepingAccount] = await Promise.all([
    rpcClient.getSlot({ commitment: 'confirmed' }).send(),
    fetchMarket(rpcClient, marketAddress, { commitment: 'confirmed' }),
    fetchBookkeeping(rpcClient, bookkeepingAddress, { commitment: 'confirmed' }),
  ])

  return {
    bookkeepingBasePerQuote: bookkeepingAccount.data.basePerQuote,
    bookkeepingLastUpdateSlot: Number(bookkeepingAccount.data.lastUpdateSlot),
    bookkeepingQuotePerBase: bookkeepingAccount.data.quotePerBase,
    currentSlot: Number(currentSlot),
    endSlotInterval: Number(marketAccount.data.endSlotInterval),
    marketBaseFlow: marketAccount.data.baseFlow,
    marketQuoteFlow: marketAccount.data.quoteFlow,
  }
}

export async function fetchTradePositions(
  rpcClient: TwobRpcClient,
  authority: string,
): Promise<TradePositionRecord[]> {
  const response = (await rpcClient
    .getProgramAccounts(TWOB_ANCHOR_PROGRAM_ADDRESS, {
      commitment: 'confirmed',
      encoding: 'base64',
      filters: [
        {
          memcmp: {
            bytes: encodeBase58(
              Uint8Array.from(getTradePositionDiscriminatorBytes()),
            ) as never,
            encoding: 'base58',
            offset: 0n,
          },
        },
        {
          memcmp: {
            bytes: authority as never,
            encoding: 'base58',
            offset: 8n,
          },
        },
      ],
    })
    .send()) as any

  const accounts = (Array.isArray(response) ? response : response.value) as Array<{
    account: { data: [string, string] }
    pubkey: Address
  }>

  return accounts
    .map(({ account, pubkey }) => ({
      address: pubkey,
      data: getTradePositionDecoder().decode(decodeBase64(account.data[0])),
    }))
    .sort((left, right) => {
      if (left.data.id === right.data.id) return 0
      return left.data.id > right.data.id ? -1 : 1
    })
}

export async function fetchEndSlotBookkeepingSnapshot({
  currentSlot,
  endSlot,
  endSlotInterval,
  isBuy,
  marketAddress,
  rpcClient,
}: {
  currentSlot: number | null
  endSlot: number
  endSlotInterval: number | null
  isBuy: boolean
  marketAddress: Address
  rpcClient: TwobRpcClient
}) {
  const snapshotLocation =
    endSlotInterval === null
      ? null
      : resolveSnapshotLocation(endSlot, endSlotInterval)

  if (!snapshotLocation) return null

  const snapshotReadySlot =
    endSlotInterval === null || endSlotInterval <= 0
      ? null
      : endSlot + ARRAY_LENGTH * endSlotInterval

  if (
    currentSlot === null ||
    snapshotReadySlot === null ||
    currentSlot < snapshotReadySlot
  ) {
    return null
  }

  const fallbackLocation =
    endSlotInterval !== null && endSlotInterval > 0
      ? resolveSnapshotLocation(endSlot - endSlotInterval, endSlotInterval)
      : null

  const candidateLocations = [snapshotLocation, fallbackLocation].filter(
    (location): location is NonNullable<typeof location> => location !== null,
  )
  const uniquePricesIndices = Array.from(
    new Set(candidateLocations.map((location) => location.pricesAccountIndex)),
  )
  const fetchedByIndex = new Map<number, Awaited<ReturnType<typeof fetchPrices>> | null>()

  await Promise.all(
    uniquePricesIndices.map(async (index) => {
      try {
        const pricesAddress = await derivePricesAddress(marketAddress, BigInt(index))
        const account = await fetchPrices(rpcClient, pricesAddress, {
          commitment: 'confirmed',
        })
        fetchedByIndex.set(index, account)
      } catch {
        fetchedByIndex.set(index, null)
      }
    }),
  )

  const readSnapshot = (location: NonNullable<typeof snapshotLocation>) => {
    const pricesAccount = fetchedByIndex.get(location.pricesAccountIndex)
    if (!pricesAccount) return null
    const snapshots = isBuy
      ? pricesAccount.data.basePerQuoteSnapshot
      : pricesAccount.data.quotePerBaseSnapshot
    return snapshots[location.snapshotIndex] ?? null
  }

  const primarySnapshot = readSnapshot(snapshotLocation)
  const fallbackSnapshot = fallbackLocation ? readSnapshot(fallbackLocation) : null

  if (primarySnapshot === null) return fallbackSnapshot
  if (fallbackSnapshot === null) return primarySnapshot
  return primarySnapshot >= fallbackSnapshot ? primarySnapshot : fallbackSnapshot
}

export async function sendSubmitOrder({
  client,
  onBeforeSend,
  request,
  session,
}: {
  client: SolanaClient
  onBeforeSend?: () => void
  request: {
    amount: bigint
    durationSlots: number
    existingWrappedAtoms?: bigint
    id: bigint
    inputMintAddress: string
    isBuy: boolean
    marketAddress: Address
  }
  session: WalletSession
}) {
  const {
    amount,
    durationSlots,
    existingWrappedAtoms = 0n,
    id,
    inputMintAddress,
    isBuy,
    marketAddress,
  } = request

  const walletSigner = createWalletTransactionSigner(session).signer
  const wrapShortfall =
    inputMintAddress === WRAPPED_SOL_MINT && amount > existingWrappedAtoms
      ? amount - existingWrappedAtoms
      : 0n
  const marketAccount = await fetchMarket(client.runtime.rpc, marketAddress, {
    commitment: 'confirmed',
  })
  const currentSlot = Number(
    await client.runtime.rpc.getSlot({ commitment: 'confirmed' }).send(),
  )
  const mint = isBuy ? marketAccount.data.quoteMint : marketAccount.data.baseMint
  const tokenProgram = await detectTokenProgram(
    client.runtime,
    mint,
    'confirmed',
  )
  const referenceIndex = getReferenceIndex(
    currentSlot,
    marketAccount.data.endSlotInterval,
  )
  const previousIndex = getPreviousIndex(referenceIndex)
  const endSlot = alignEndSlot(
    currentSlot,
    durationSlots,
    marketAccount.data.endSlotInterval,
  )
  const futureIndex = getFutureIndex(endSlot, marketAccount.data.endSlotInterval)

  const [currentExits, previousExits, currentPrices, previousPrices] =
    await Promise.all([
      deriveExitsAddress(marketAddress, referenceIndex),
      deriveExitsAddress(marketAddress, previousIndex),
      derivePricesAddress(marketAddress, referenceIndex),
      derivePricesAddress(marketAddress, previousIndex),
    ])

  const instruction = await getSubmitOrderInstructionAsync({
    amount,
    authority: walletSigner,
    currentExits,
    currentPrices,
    endSlot,
    futureIndex,
    id,
    market: marketAddress,
    mint,
    previousExits,
    previousPrices,
    referenceIndex,
    tokenProgram: tokenProgram.programAddress,
  })

  const wrapInstructions =
    wrapShortfall > 0n
      ? (
          await client.wsol.prepareWrap({
            amount: wrapShortfall,
            authority: walletSigner,
            commitment: 'confirmed',
            owner: session.account.address,
          })
        ).message.instructions
      : []

  onBeforeSend?.()
  const { value: blockhashLifetime } = await client.runtime.rpc
    .getLatestBlockhash({ commitment: 'confirmed' })
    .send()

  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (message) => setTransactionMessageFeePayerSigner(walletSigner, message),
    (message) =>
      setTransactionMessageLifetimeUsingBlockhash(blockhashLifetime, message),
    (message) =>
      appendTransactionMessageInstructions(
        [...wrapInstructions, instruction],
        message,
      ),
  )

  if (isTransactionMessageWithSingleSendingSigner(transactionMessage)) {
    const signatureBytes = await signAndSendTransactionMessageWithSigners(
      transactionMessage,
    )
    const signature = getBase58Decoder().decode(signatureBytes)
    await waitForConfirmedSignature(client.runtime.rpc, signature)
    return signature
  }

  const signedTransaction = await signTransactionMessageWithSigners(
    transactionMessage,
  )
  const blockhashBackedTransaction =
    signedTransaction as Parameters<typeof client.actions.sendTransaction>[0]
  const signature = await client.actions.sendTransaction(
    blockhashBackedTransaction,
    'confirmed',
  )
  const serializedSignature = signature.toString()
  await waitForConfirmedSignature(client.runtime.rpc, serializedSignature)
  return serializedSignature
}

export async function sendClosePosition({
  client,
  request,
  sendTransaction,
  session,
}: {
  client: SolanaClient
  request: {
    marketAddress: Address
    tradePositionAddress: Address
  }
  sendTransaction: SendTransactionHelper
  session: WalletSession
}) {
  const { marketAddress, tradePositionAddress } = request
  const walletSigner = createWalletTransactionSigner(session).signer
  const [marketAccount, tradePositionAccount, currentSlot] = await Promise.all([
    fetchMarket(client.runtime.rpc, marketAddress, { commitment: 'confirmed' }),
    fetchTradePosition(client.runtime.rpc, tradePositionAddress, {
      commitment: 'confirmed',
    }),
    client.runtime.rpc.getSlot({ commitment: 'confirmed' }).send(),
  ])

  const [baseTokenProgram, quoteTokenProgram] = await Promise.all([
    detectTokenProgram(client.runtime, marketAccount.data.baseMint, 'confirmed'),
    detectTokenProgram(client.runtime, marketAccount.data.quoteMint, 'confirmed'),
  ])

  const referenceIndex = getReferenceIndex(
    Number(currentSlot),
    marketAccount.data.endSlotInterval,
  )
  const previousIndex = getPreviousIndex(referenceIndex)
  const futureIndex = getFutureIndex(
    tradePositionAccount.data.endSlot,
    marketAccount.data.endSlotInterval,
  )

  const [
    futureExits,
    futurePrices,
    currentExits,
    previousExits,
    currentPrices,
    previousPrices,
  ] = await Promise.all([
    deriveExitsAddress(marketAddress, futureIndex),
    derivePricesAddress(marketAddress, futureIndex),
    deriveExitsAddress(marketAddress, referenceIndex),
    deriveExitsAddress(marketAddress, previousIndex),
    derivePricesAddress(marketAddress, referenceIndex),
    derivePricesAddress(marketAddress, previousIndex),
  ])

  const instruction = await getAuthorityClosePositionInstructionAsync({
    authority: walletSigner,
    baseMint: marketAccount.data.baseMint,
    baseTokenProgram: baseTokenProgram.programAddress,
    currentExits,
    currentPrices,
    futureExits,
    futurePrices,
    market: marketAddress,
    previousExits,
    previousPrices,
    quoteMint: marketAccount.data.quoteMint,
    quoteTokenProgram: quoteTokenProgram.programAddress,
    referenceIndex,
    tradePosition: tradePositionAddress,
  })

  const unwrapInstructions =
    marketAccount.data.baseMint === WRAPPED_SOL_MINT ||
    marketAccount.data.quoteMint === WRAPPED_SOL_MINT
      ? (
          await client.wsol.prepareUnwrap({
            authority: walletSigner,
            commitment: 'confirmed',
            owner: session.account.address,
          })
        ).message.instructions
      : []

  const signature = await sendTransaction.send({
    authority: walletSigner,
    instructions: [instruction, ...unwrapInstructions],
  })
  const serializedSignature = signature.toString()
  await waitForConfirmedSignature(client.runtime.rpc, serializedSignature)
  return serializedSignature
}
