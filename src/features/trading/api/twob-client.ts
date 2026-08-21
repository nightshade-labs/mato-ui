import {
  SIGNATURE_STATUS_TIMEOUT_MS,
  WRAPPED_SOL_MINT,
  confirmationMeetsCommitment,
  createWalletTransactionSigner,
  deriveConfirmationStatus,
  detectTokenProgram,
  normalizeSignature,
} from '@solana/client'
import {
  AccountRole,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getAddressEncoder,
  getBase58Decoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getU32Encoder,
  getU64Encoder,
  isTransactionMessageWithSingleSendingSigner,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  signTransactionMessageWithSigners,
} from '@solana/kit'
import {
  ARRAY_LENGTH,
  MAX_BATCH_CLOSE_POSITIONS_PER_TRANSACTION,
} from '../constants'
import { encodeBase58 } from '../lib/base58'
import { decodeBase64 } from '../lib/bytes'
import { collectCloseableRentAccountPairs } from '../lib/rent'
import {
  getTradePositionEndSlot,
  isBuyTradePosition,
} from '../lib/trade-position'
import {
  fetchOwnedExitsAccounts,
  fetchOwnedPricesAccounts,
} from './rent-accounts'
import type { SolanaClient, WalletSession } from '@solana/client'
import type { UseSendTransactionReturnType } from '@solana/react-hooks'
import type { Address, TransactionSigner } from '@solana/kit'
import type {
  StreamingMarketState,
  TradePositionRecord,
} from '../domain/models'
import type { ExitsRentAccount, PricesRentAccount } from '../lib/rent'
import type {
  Market,
  TradePosition,
} from '@/lib/generated/twob/src/generated/accounts'
import {
  fetchBookkeeping,
  fetchMarket,
  fetchPrices,
  fetchTradePosition,
  getTradePositionDecoder,
  getTradePositionDiscriminatorBytes,
} from '@/lib/generated/twob/src/generated/accounts'
import {
  getAuthorityCloseTradePositionInstructionAsync,
  getCloseExitsAndPricesAccountInstructionAsync,
  getPauseTradePositionInstructionAsync,
  getSubmitOrderInstructionAsync,
  getUnpauseTradePositionInstructionAsync,
  getWithdrawSwappedInstructionAsync,
} from '@/lib/generated/twob/src/generated/instructions'
import { TWOB_ANCHOR_PROGRAM_ADDRESS } from '@/lib/generated/twob/src/generated/programs'

const textEncoder = new TextEncoder()
const BOOKKEEPING_DELAY_SLOTS = 20
const TRADE_POSITION_MARKET_ID_OFFSET = 268n
const SIGNATURE_POLL_INTERVAL_MS = 1_000
const ASSOCIATED_TOKEN_PROGRAM_ADDRESS =
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address
const SYSTEM_PROGRAM_ADDRESS = '11111111111111111111111111111111' as Address

export type TwobRpcClient = SolanaClient['runtime']['rpc']

type SendTransactionHelper = Pick<UseSendTransactionReturnType, 'send'>
type GetProgramAccountsConfig = NonNullable<
  Parameters<TwobRpcClient['getProgramAccounts']>[1]
>
type GetProgramAccountsFilter = NonNullable<
  GetProgramAccountsConfig['filters']
>[number]

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
      throw new Error(
        `Transaction failed during confirmation: ${JSON.stringify(status.err)}`,
      )
    }

    if (
      confirmationMeetsCommitment(deriveConfirmationStatus(status), 'confirmed')
    ) {
      return
    }

    await new Promise((resolve) =>
      setTimeout(resolve, SIGNATURE_POLL_INTERVAL_MS),
    )
  }

  throw new Error('Transaction confirmation timed out.')
}

export async function deriveMarketAddress(marketId: number) {
  const [address] = await getProgramDerivedAddress({
    programAddress: TWOB_ANCHOR_PROGRAM_ADDRESS,
    seeds: [seed('market'), getU32Encoder().encode(marketId)],
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

export async function deriveExitsAddress(
  marketAddress: Address,
  index: bigint | number,
) {
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

export async function derivePricesAddress(
  marketAddress: Address,
  index: bigint | number,
) {
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

export async function deriveAssociatedTokenAddress({
  mint,
  owner,
  tokenProgram,
}: {
  mint: Address
  owner: Address
  tokenProgram: Address
}) {
  const [address] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    seeds: [
      getAddressEncoder().encode(owner),
      getAddressEncoder().encode(tokenProgram),
      getAddressEncoder().encode(mint),
    ],
  })
  return address
}

export async function deriveTemporaryWithdrawTokenAddress(
  tradePositionAddress: Address,
) {
  const [address] = await getProgramDerivedAddress({
    programAddress: TWOB_ANCHOR_PROGRAM_ADDRESS,
    seeds: [getAddressEncoder().encode(tradePositionAddress)],
  })
  return address
}

export function getReferenceIndex(
  currentSlot: number,
  endSlotInterval: bigint | number,
) {
  return BigInt(
    Math.max(
      1,
      Math.floor(
        (currentSlot + BOOKKEEPING_DELAY_SLOTS) /
          (ARRAY_LENGTH * Number(endSlotInterval)),
      ),
    ),
  )
}

export function getPreviousIndex(referenceIndex: bigint) {
  return referenceIndex - 1n
}

export function getFutureIndex(
  endSlot: bigint,
  endSlotInterval: bigint | number,
) {
  return endSlot / BigInt(ARRAY_LENGTH) / BigInt(endSlotInterval)
}

export function alignEndSlot(
  currentSlot: number,
  durationSlots: number,
  endSlotInterval: bigint | number,
) {
  const interval = Number(endSlotInterval)
  return BigInt(
    Math.floor((currentSlot + durationSlots + interval / 2) / interval) *
      interval,
  )
}

export function getUnpausedEndSlot(
  currentSlot: bigint | number,
  remainingSlots: number,
  endSlotInterval: bigint | number,
) {
  const slot = BigInt(currentSlot)
  const interval = BigInt(endSlotInterval)
  return ((slot + BigInt(remainingSlots) + interval) / interval) * interval
}

export function getSwappedPositionAsset(
  market: Pick<Market, 'baseMint' | 'quoteMint'>,
  tradePosition: Pick<TradePosition, 'baseReceiver' | 'quoteReceiver' | 'side'>,
) {
  return isBuyTradePosition(tradePosition)
    ? { mint: market.baseMint, receiver: tradePosition.baseReceiver }
    : { mint: market.quoteMint, receiver: tradePosition.quoteReceiver }
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
    fetchBookkeeping(rpcClient, bookkeepingAddress, {
      commitment: 'confirmed',
    }),
  ])

  return {
    baseMint: marketAccount.data.baseMint,
    bookkeepingBasePerQuote: bookkeepingAccount.data.basePerQuote,
    bookkeepingLastUpdateSlot: Number(bookkeepingAccount.data.lastUpdateSlot),
    bookkeepingQuotePerBase: bookkeepingAccount.data.quotePerBase,
    currentSlot: Number(currentSlot),
    endSlotInterval: Number(marketAccount.data.endSlotInterval),
    isPaused: marketAccount.data.isPaused !== 0,
    marketBaseFlow: marketAccount.data.baseFlow,
    marketId: marketAccount.data.id,
    marketQuoteFlow: marketAccount.data.quoteFlow,
    minimumBaseDepositAtoms: marketAccount.data.minimumBaseDepositAtoms,
    minimumQuoteDepositAtoms: marketAccount.data.minimumQuoteDepositAtoms,
    quoteMint: marketAccount.data.quoteMint,
  }
}

function getTradePositionMarketIdFilter(
  marketId: number,
): GetProgramAccountsFilter {
  return {
    memcmp: {
      bytes: encodeBase58(
        Uint8Array.from(getU32Encoder().encode(marketId)),
      ) as never,
      encoding: 'base58',
      offset: TRADE_POSITION_MARKET_ID_OFFSET,
    },
  }
}

export async function fetchTradePositions(
  rpcClient: TwobRpcClient,
  authority: string,
  marketId: number,
): Promise<Array<TradePositionRecord>> {
  const positions = await fetchTradePositionAccounts(rpcClient, [
    {
      memcmp: {
        bytes: authority as never,
        encoding: 'base58',
        offset: 8n,
      },
    },
    getTradePositionMarketIdFilter(marketId),
  ])
  return positions.filter((position) => position.data.marketId === marketId)
}

async function fetchTradePositionAccounts(
  rpcClient: TwobRpcClient,
  extraFilters: Array<GetProgramAccountsFilter> = [],
): Promise<Array<TradePositionRecord>> {
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
        ...extraFilters,
      ],
    })
    .send()) as any

  const accounts = (
    Array.isArray(response) ? response : response.value
  ) as Array<{
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

export async function fetchMarketTradePositions(
  rpcClient: TwobRpcClient,
  marketId: number,
): Promise<Array<TradePositionRecord>> {
  const positions = await fetchTradePositionAccounts(rpcClient, [
    getTradePositionMarketIdFilter(marketId),
  ])
  return positions.filter((position) => position.data.marketId === marketId)
}

export async function fetchEndSlotBookkeepingSnapshot({
  bookkeepingLastUpdateSlot,
  endSlot,
  endSlotInterval,
  isBuy,
  marketAddress,
  rpcClient,
}: {
  bookkeepingLastUpdateSlot: number | null
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

  if (
    bookkeepingLastUpdateSlot === null ||
    bookkeepingLastUpdateSlot < endSlot
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
  const fetchedByIndex = new Map<
    number,
    Awaited<ReturnType<typeof fetchPrices>> | null
  >()

  await Promise.all(
    uniquePricesIndices.map(async (index) => {
      try {
        const pricesAddress = await derivePricesAddress(
          marketAddress,
          BigInt(index),
        )
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
  const fallbackSnapshot = fallbackLocation
    ? readSnapshot(fallbackLocation)
    : null

  if (primarySnapshot === null) return fallbackSnapshot
  if (fallbackSnapshot === null) return primarySnapshot
  return primarySnapshot >= fallbackSnapshot
    ? primarySnapshot
    : fallbackSnapshot
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
    id: number
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

  if (!Number.isInteger(id) || id < 0 || id > 0xffffffff) {
    throw new Error('Order id must be an unsigned 32-bit integer.')
  }
  if (
    !Number.isInteger(durationSlots) ||
    durationSlots <= 0 ||
    durationSlots > 0xffffffff
  ) {
    throw new Error('Order duration must be a positive 32-bit slot count.')
  }

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
  const mint = isBuy
    ? marketAccount.data.quoteMint
    : marketAccount.data.baseMint
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
  const positionStartSlot = Math.max(
    currentSlot,
    Number(marketAccount.data.startSlot),
  )
  const endSlot = alignEndSlot(
    positionStartSlot,
    durationSlots,
    marketAccount.data.endSlotInterval,
  )
  const futureIndex = getFutureIndex(
    endSlot,
    marketAccount.data.endSlotInterval,
  )

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
    baseReceiver: session.account.address,
    currentExits,
    currentPrices,
    duration: durationSlots,
    futureIndex,
    id,
    market: marketAddress,
    mint,
    operator: session.account.address,
    payer: walletSigner,
    previousExits,
    previousPrices,
    quoteReceiver: session.account.address,
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
    const signatureBytes =
      await signAndSendTransactionMessageWithSigners(transactionMessage)
    const signature = getBase58Decoder().decode(signatureBytes)
    await waitForConfirmedSignature(client.runtime.rpc, signature)
    return signature
  }

  const signedTransaction =
    await signTransactionMessageWithSigners(transactionMessage)
  const blockhashBackedTransaction = signedTransaction as Parameters<
    typeof client.actions.sendTransaction
  >[0]
  const signature = await client.actions.sendTransaction(
    blockhashBackedTransaction,
    'confirmed',
  )
  const serializedSignature = signature.toString()
  await waitForConfirmedSignature(client.runtime.rpc, serializedSignature)
  return serializedSignature
}

function getCreateAssociatedTokenIdempotentInstruction({
  ata,
  mint,
  owner,
  payer,
  tokenProgram,
}: {
  ata: Address
  mint: Address
  owner: Address
  payer: TransactionSigner
  tokenProgram: Address
}) {
  return Object.freeze({
    accounts: [
      {
        address: payer.address,
        role: AccountRole.WRITABLE_SIGNER,
        signer: payer,
      },
      { address: ata, role: AccountRole.WRITABLE },
      { address: owner, role: AccountRole.READONLY },
      { address: mint, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: tokenProgram, role: AccountRole.READONLY },
    ] as const,
    data: new Uint8Array([1]),
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  })
}

async function getPositionControlContext({
  client,
  marketAddress,
  session,
  tradePositionAddress,
}: {
  client: SolanaClient
  marketAddress: Address
  session: WalletSession
  tradePositionAddress: Address
}) {
  const [marketAccount, tradePositionAccount] = await Promise.all([
    fetchMarket(client.runtime.rpc, marketAddress, {
      commitment: 'confirmed',
    }),
    fetchTradePosition(client.runtime.rpc, tradePositionAddress, {
      commitment: 'confirmed',
    }),
  ])
  const tradePosition = tradePositionAccount.data
  const walletAddress = session.account.address.toString()

  if (tradePosition.marketId !== marketAccount.data.id) {
    throw new Error('Trade position belongs to a different market.')
  }
  if (
    tradePosition.authority.toString() !== walletAddress &&
    tradePosition.operator.toString() !== walletAddress
  ) {
    throw new Error('This wallet is not allowed to control the position.')
  }

  return {
    market: marketAccount.data,
    tradePosition,
  }
}

async function derivePositionReferenceAccounts({
  currentSlot,
  endSlotInterval,
  marketAddress,
}: {
  currentSlot: number
  endSlotInterval: number
  marketAddress: Address
}) {
  const referenceIndex = getReferenceIndex(currentSlot, endSlotInterval)
  const previousIndex = getPreviousIndex(referenceIndex)
  const [currentExits, previousExits, currentPrices, previousPrices] =
    await Promise.all([
      deriveExitsAddress(marketAddress, referenceIndex),
      deriveExitsAddress(marketAddress, previousIndex),
      derivePricesAddress(marketAddress, referenceIndex),
      derivePricesAddress(marketAddress, previousIndex),
    ])

  return {
    currentExits,
    currentPrices,
    previousExits,
    previousPrices,
    referenceIndex,
  }
}

export async function sendPauseTradePosition({
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
  const { market, tradePosition } = await getPositionControlContext({
    client,
    marketAddress,
    session,
    tradePositionAddress,
  })

  if (tradePosition.pausedAtSlot > 0n) {
    throw new Error('This position is already paused.')
  }

  const [baseTokenProgram, quoteTokenProgram] = await Promise.all([
    detectTokenProgram(client.runtime, market.baseMint, 'confirmed'),
    detectTokenProgram(client.runtime, market.quoteMint, 'confirmed'),
  ])
  const currentSlot = Number(
    await client.runtime.rpc.getSlot({ commitment: 'confirmed' }).send(),
  )
  if (BigInt(currentSlot) >= getTradePositionEndSlot(tradePosition)) {
    throw new Error('This position has already ended and cannot be paused.')
  }
  if (BigInt(currentSlot) <= market.startSlot) {
    throw new Error('This market has not started yet.')
  }

  const referenceAccounts = await derivePositionReferenceAccounts({
    currentSlot,
    endSlotInterval: market.endSlotInterval,
    marketAddress,
  })
  const futureIndex = getFutureIndex(
    getTradePositionEndSlot(tradePosition),
    market.endSlotInterval,
  )
  const futureExits = await deriveExitsAddress(marketAddress, futureIndex)
  const instruction = await getPauseTradePositionInstructionAsync({
    baseMint: market.baseMint,
    baseTokenProgram: baseTokenProgram.programAddress,
    currentExits: referenceAccounts.currentExits,
    currentPrices: referenceAccounts.currentPrices,
    futureExits,
    market: marketAddress,
    previousExits: referenceAccounts.previousExits,
    previousPrices: referenceAccounts.previousPrices,
    quoteMint: market.quoteMint,
    quoteTokenProgram: quoteTokenProgram.programAddress,
    referenceIndex: referenceAccounts.referenceIndex,
    signer: walletSigner,
    tradePosition: tradePositionAddress,
  })

  const signature = await sendTransaction.send({
    authority: walletSigner,
    instructions: [instruction],
  })
  const serializedSignature = signature.toString()
  await waitForConfirmedSignature(client.runtime.rpc, serializedSignature)
  return serializedSignature
}

export async function sendUnpauseTradePosition({
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
  const { market, tradePosition } = await getPositionControlContext({
    client,
    marketAddress,
    session,
    tradePositionAddress,
  })

  if (tradePosition.pausedAtSlot === 0n) {
    throw new Error('This position is not paused.')
  }
  if (market.isPaused !== 0) {
    throw new Error('The market is paused. Try resuming the position later.')
  }

  const [baseTokenProgram, quoteTokenProgram] = await Promise.all([
    detectTokenProgram(client.runtime, market.baseMint, 'confirmed'),
    detectTokenProgram(client.runtime, market.quoteMint, 'confirmed'),
  ])
  const currentSlot = Number(
    await client.runtime.rpc.getSlot({ commitment: 'confirmed' }).send(),
  )
  const referenceAccounts = await derivePositionReferenceAccounts({
    currentSlot,
    endSlotInterval: market.endSlotInterval,
    marketAddress,
  })
  const oldIndex = getFutureIndex(
    getTradePositionEndSlot(tradePosition),
    market.endSlotInterval,
  )
  const unpausedEndSlot = getUnpausedEndSlot(
    currentSlot,
    tradePosition.remainingSlots,
    market.endSlotInterval,
  )
  const futureIndex = getFutureIndex(unpausedEndSlot, market.endSlotInterval)
  const [oldExits, futureExits, futurePrices] = await Promise.all([
    deriveExitsAddress(marketAddress, oldIndex),
    deriveExitsAddress(marketAddress, futureIndex),
    derivePricesAddress(marketAddress, futureIndex),
  ])
  const instruction = await getUnpauseTradePositionInstructionAsync({
    baseMint: market.baseMint,
    baseTokenProgram: baseTokenProgram.programAddress,
    currentExits: referenceAccounts.currentExits,
    currentPrices: referenceAccounts.currentPrices,
    futureExits,
    futureIndex,
    futurePrices,
    market: marketAddress,
    oldExits,
    previousExits: referenceAccounts.previousExits,
    previousPrices: referenceAccounts.previousPrices,
    quoteMint: market.quoteMint,
    quoteTokenProgram: quoteTokenProgram.programAddress,
    referenceIndex: referenceAccounts.referenceIndex,
    signer: walletSigner,
    tradePosition: tradePositionAddress,
  })

  const signature = await sendTransaction.send({
    authority: walletSigner,
    instructions: [instruction],
  })
  const serializedSignature = signature.toString()
  await waitForConfirmedSignature(client.runtime.rpc, serializedSignature)
  return serializedSignature
}

export async function sendWithdrawSwapped({
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
  const { market, tradePosition } = await getPositionControlContext({
    client,
    marketAddress,
    session,
    tradePositionAddress,
  })

  const { mint, receiver } = getSwappedPositionAsset(market, tradePosition)
  const tokenProgram = await detectTokenProgram(
    client.runtime,
    mint,
    'confirmed',
  )
  const currentSlot = Number(
    await client.runtime.rpc.getSlot({ commitment: 'confirmed' }).send(),
  )
  if (
    tradePosition.pausedAtSlot === 0n &&
    BigInt(currentSlot) >= getTradePositionEndSlot(tradePosition)
  ) {
    throw new Error(
      'This position has already ended. Close it to receive the remaining funds.',
    )
  }
  if (BigInt(currentSlot) <= market.startSlot) {
    throw new Error('This market has not started yet.')
  }
  const referenceAccounts = await derivePositionReferenceAccounts({
    currentSlot,
    endSlotInterval: market.endSlotInterval,
    marketAddress,
  })
  const isNative = mint.toString() === WRAPPED_SOL_MINT
  const receiverTokenAccount = isNative
    ? await deriveTemporaryWithdrawTokenAddress(tradePositionAddress)
    : await deriveAssociatedTokenAddress({
        mint,
        owner: receiver,
        tokenProgram: tokenProgram.programAddress,
      })
  const withdrawInstruction = await getWithdrawSwappedInstructionAsync({
    currentExits: referenceAccounts.currentExits,
    currentPrices: referenceAccounts.currentPrices,
    market: marketAddress,
    mint,
    previousExits: referenceAccounts.previousExits,
    previousPrices: referenceAccounts.previousPrices,
    receiver,
    receiverTokenAccount,
    referenceIndex: referenceAccounts.referenceIndex,
    signer: walletSigner,
    tokenProgram: tokenProgram.programAddress,
    tradePosition: tradePositionAddress,
  })
  const createReceiverInstruction = isNative
    ? null
    : getCreateAssociatedTokenIdempotentInstruction({
        ata: receiverTokenAccount,
        mint,
        owner: receiver,
        payer: walletSigner,
        tokenProgram: tokenProgram.programAddress,
      })
  const instructions = createReceiverInstruction
    ? [createReceiverInstruction, withdrawInstruction]
    : [withdrawInstruction]

  const signature = await sendTransaction.send({
    authority: walletSigner,
    instructions,
  })
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
  return sendClosePositions({
    client,
    request: {
      marketAddress: request.marketAddress,
      tradePositionAddresses: [request.tradePositionAddress],
    },
    sendTransaction,
    session,
  })
}

export async function sendClosePositions({
  client,
  request,
  sendTransaction,
  session,
}: {
  client: SolanaClient
  request: {
    marketAddress: Address
    tradePositionAddresses: Array<Address>
  }
  sendTransaction: SendTransactionHelper
  session: WalletSession
}) {
  const { marketAddress, tradePositionAddresses } = request
  if (tradePositionAddresses.length === 0) {
    throw new Error('Select at least one position to close.')
  }
  if (
    tradePositionAddresses.length > MAX_BATCH_CLOSE_POSITIONS_PER_TRANSACTION
  ) {
    throw new Error(
      `Close up to ${MAX_BATCH_CLOSE_POSITIONS_PER_TRANSACTION} positions at once.`,
    )
  }

  const walletSigner = createWalletTransactionSigner(session).signer
  const [marketAccount, tradePositionAccounts, currentSlot] = await Promise.all(
    [
      fetchMarket(client.runtime.rpc, marketAddress, {
        commitment: 'confirmed',
      }),
      Promise.all(
        tradePositionAddresses.map((tradePositionAddress) =>
          fetchTradePosition(client.runtime.rpc, tradePositionAddress, {
            commitment: 'confirmed',
          }),
        ),
      ),
      client.runtime.rpc.getSlot({ commitment: 'confirmed' }).send(),
    ],
  )

  const [baseTokenProgram, quoteTokenProgram] = await Promise.all([
    detectTokenProgram(
      client.runtime,
      marketAccount.data.baseMint,
      'confirmed',
    ),
    detectTokenProgram(
      client.runtime,
      marketAccount.data.quoteMint,
      'confirmed',
    ),
  ])

  const referenceIndex = getReferenceIndex(
    Number(currentSlot),
    marketAccount.data.endSlotInterval,
  )
  const previousIndex = getPreviousIndex(referenceIndex)

  const [currentExits, previousExits, currentPrices, previousPrices] =
    await Promise.all([
      deriveExitsAddress(marketAddress, referenceIndex),
      deriveExitsAddress(marketAddress, previousIndex),
      derivePricesAddress(marketAddress, referenceIndex),
      derivePricesAddress(marketAddress, previousIndex),
    ])

  const closeInstructions = await Promise.all(
    tradePositionAccounts.map(async (tradePositionAccount, index) => {
      const tradePositionAddress = tradePositionAddresses[index]
      if (!tradePositionAddress) {
        throw new Error('Failed to resolve position address.')
      }

      const tradePosition = tradePositionAccount.data
      if (tradePosition.marketId !== marketAccount.data.id) {
        throw new Error('Trade position belongs to a different market.')
      }
      const futureIndex = getFutureIndex(
        getTradePositionEndSlot(tradePosition),
        marketAccount.data.endSlotInterval,
      )
      const [futureExits, futurePrices] = await Promise.all([
        deriveExitsAddress(marketAddress, futureIndex),
        derivePricesAddress(marketAddress, futureIndex),
      ])
      const [futureExitsAccountInfo, futurePricesAccountInfo] =
        await Promise.all([
          client.runtime.rpc
            .getAccountInfo(futureExits, {
              commitment: 'confirmed',
              encoding: 'base64',
            })
            .send(),
          client.runtime.rpc
            .getAccountInfo(futurePrices, {
              commitment: 'confirmed',
              encoding: 'base64',
            })
            .send(),
        ])

      if (!futureExitsAccountInfo.value) {
        throw new Error(
          'Cannot close this position because its exits account is missing. It may have been reclaimed while the position was still open.',
        )
      }
      if (!futurePricesAccountInfo.value) {
        throw new Error(
          'Cannot close this position because its prices account is missing. It may have been reclaimed while the position was still open.',
        )
      }

      return getAuthorityCloseTradePositionInstructionAsync({
        authority: walletSigner,
        baseMint: marketAccount.data.baseMint,
        baseReceiver: tradePosition.baseReceiver,
        baseTokenProgram: baseTokenProgram.programAddress,
        currentExits,
        currentPrices,
        futureExits,
        futurePrices,
        market: marketAddress,
        payer: tradePosition.payer,
        previousExits,
        previousPrices,
        quoteMint: marketAccount.data.quoteMint,
        quoteReceiver: tradePosition.quoteReceiver,
        quoteTokenProgram: quoteTokenProgram.programAddress,
        referenceIndex,
        tradePosition: tradePositionAddress,
      })
    }),
  )

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
    instructions: [...closeInstructions, ...unwrapInstructions],
  })
  const serializedSignature = signature.toString()
  await waitForConfirmedSignature(client.runtime.rpc, serializedSignature)
  return serializedSignature
}

export async function sendReclaimRent({
  client,
  request,
  session,
}: {
  client: SolanaClient
  request: {
    marketAddress: Address
    maxAccounts: number
  }
  session: WalletSession
}) {
  const { marketAddress, maxAccounts } = request
  const walletSigner = createWalletTransactionSigner(session).signer
  const ownerAddress = session.account.address
  const owner = ownerAddress.toString()

  const [currentSlot, marketAccount, ownedExitsAccounts, ownedPricesAccounts] =
    await Promise.all([
      client.runtime.rpc.getSlot({ commitment: 'confirmed' }).send(),
      fetchMarket(client.runtime.rpc, marketAddress, {
        commitment: 'confirmed',
      }),
      fetchOwnedExitsAccounts(client.runtime.rpc, owner),
      fetchOwnedPricesAccounts(client.runtime.rpc, owner),
    ])

  const exitsAccounts: Array<ExitsRentAccount> = ownedExitsAccounts.map(
    (account) => ({
      address: account.address,
      index: account.data.index,
      lamports: account.lamports,
      market: account.data.market,
      openPositions: account.data.openPositions,
      payer: account.data.payer,
    }),
  )
  const pricesAccounts: Array<PricesRentAccount> = ownedPricesAccounts.map(
    (account) => ({
      address: account.address,
      index: account.data.index,
      lamports: account.lamports,
      market: account.data.market,
      payer: account.data.payer,
    }),
  )

  const referenceIndex = getReferenceIndex(
    Number(currentSlot),
    marketAccount.data.endSlotInterval,
  )
  if (referenceIndex <= 0n) {
    throw new Error('Reclaim rent is not available yet for this market.')
  }
  const previousIndex = getPreviousIndex(referenceIndex)
  const candidatePairs = collectCloseableRentAccountPairs({
    currentSlot: Number(currentSlot),
    endSlotInterval: marketAccount.data.endSlotInterval,
    exitsAccounts,
    maxAccounts: exitsAccounts.length + pricesAccounts.length,
    market: marketAddress,
    payer: ownerAddress,
    pricesAccounts,
  })
  const closeablePairs = candidatePairs.slice(
    0,
    Math.max(0, Math.floor(maxAccounts / 2)),
  )

  if (closeablePairs.length === 0) {
    throw new Error('No reclaimable rent accounts available.')
  }
  const reclaimedLamports = closeablePairs.reduce(
    (sum, pair) => sum + pair.exits.lamports + pair.prices.lamports,
    0n,
  )
  const [
    bookkeepingAddress,
    currentExits,
    previousExits,
    currentPrices,
    previousPrices,
  ] = await Promise.all([
    deriveBookkeepingAddress(marketAddress),
    deriveExitsAddress(marketAddress, referenceIndex),
    deriveExitsAddress(marketAddress, previousIndex),
    derivePricesAddress(marketAddress, referenceIndex),
    derivePricesAddress(marketAddress, previousIndex),
  ])

  const instructions = await Promise.all(
    closeablePairs.map((pair) =>
      getCloseExitsAndPricesAccountInstructionAsync({
        bookkeeping: bookkeepingAddress,
        currentExits,
        currentPrices,
        exits: pair.exits.address,
        market: marketAddress,
        payer: pair.exits.payer,
        previousExits,
        previousPrices,
        prices: pair.prices.address,
        referenceIndex,
        signer: walletSigner,
      }),
    ),
  )

  const { value: blockhashLifetime } = await client.runtime.rpc
    .getLatestBlockhash({ commitment: 'confirmed' })
    .send()

  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (message) => setTransactionMessageFeePayerSigner(walletSigner, message),
    (message) =>
      setTransactionMessageLifetimeUsingBlockhash(blockhashLifetime, message),
    (message) => appendTransactionMessageInstructions(instructions, message),
  )

  let serializedSignature: string
  if (isTransactionMessageWithSingleSendingSigner(transactionMessage)) {
    const signatureBytes =
      await signAndSendTransactionMessageWithSigners(transactionMessage)
    serializedSignature = getBase58Decoder().decode(signatureBytes)
  } else {
    const signedTransaction =
      await signTransactionMessageWithSigners(transactionMessage)
    const blockhashBackedTransaction = signedTransaction as Parameters<
      typeof client.actions.sendTransaction
    >[0]
    const signature = await client.actions.sendTransaction(
      blockhashBackedTransaction,
      'confirmed',
    )
    serializedSignature = signature.toString()
  }
  await waitForConfirmedSignature(client.runtime.rpc, serializedSignature)

  return {
    reclaimedLamports,
    signature: serializedSignature,
  }
}
