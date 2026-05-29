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
import { collectCloseableRentAccounts } from '../lib/rent'
import {
  fetchOwnedExitsAccounts,
  fetchOwnedPricesAccounts,
} from './rent-accounts'
import type { SolanaClient, WalletSession } from '@solana/client'
import type { UseSendTransactionReturnType } from '@solana/react-hooks'
import type { Address, Instruction } from '@solana/kit'
import type {
  StreamingMarketState,
  TradePositionRecord,
} from '../domain/models'
import type { ExitsRentAccount, PricesRentAccount } from '../lib/rent'
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
import { getCloseExitsAccountInstructionDataEncoder } from '@/lib/generated/twob/src/generated/instructions/closeExitsAccount'
import { getClosePricesAccountInstructionDataEncoder } from '@/lib/generated/twob/src/generated/instructions/closePricesAccount'
import { TWOB_ANCHOR_PROGRAM_ADDRESS } from '@/lib/generated/twob/src/generated/programs'

const textEncoder = new TextEncoder()
const BOOKKEEPING_DELAY_SLOTS = 20
const SIGNATURE_POLL_INTERVAL_MS = 1_000
const SYSTEM_PROGRAM_ADDRESS =
  '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>

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

function buildCloseExitsAccountInstruction({
  bookkeepingAddress,
  currentExits,
  currentPrices,
  exitsAddress,
  marketAddress,
  ownerAddress,
  previousExits,
  previousPrices,
  referenceIndex,
  signerAddress,
}: {
  bookkeepingAddress: Address
  currentExits: Address
  currentPrices: Address
  exitsAddress: Address
  marketAddress: Address
  ownerAddress: Address
  previousExits: Address
  previousPrices: Address
  referenceIndex: bigint
  signerAddress: Address
}): Instruction {
  return Object.freeze({
    accounts: [
      { address: signerAddress, role: AccountRole.WRITABLE_SIGNER },
      { address: ownerAddress, role: AccountRole.WRITABLE },
      { address: exitsAddress, role: AccountRole.WRITABLE },
      { address: marketAddress, role: AccountRole.WRITABLE },
      { address: bookkeepingAddress, role: AccountRole.WRITABLE },
      { address: currentExits, role: AccountRole.READONLY },
      { address: previousExits, role: AccountRole.READONLY },
      { address: currentPrices, role: AccountRole.WRITABLE },
      { address: previousPrices, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: getCloseExitsAccountInstructionDataEncoder().encode({
      referenceIndex,
    }),
    programAddress: TWOB_ANCHOR_PROGRAM_ADDRESS,
  })
}

function buildClosePricesAccountInstruction({
  bookkeepingAddress,
  currentExits,
  currentPrices,
  marketAddress,
  ownerAddress,
  previousExits,
  previousPrices,
  pricesAddress,
  referenceIndex,
  signerAddress,
}: {
  bookkeepingAddress: Address
  currentExits: Address
  currentPrices: Address
  marketAddress: Address
  ownerAddress: Address
  previousExits: Address
  previousPrices: Address
  pricesAddress: Address
  referenceIndex: bigint
  signerAddress: Address
}): Instruction {
  return Object.freeze({
    accounts: [
      { address: signerAddress, role: AccountRole.WRITABLE_SIGNER },
      { address: ownerAddress, role: AccountRole.WRITABLE },
      { address: pricesAddress, role: AccountRole.WRITABLE },
      { address: marketAddress, role: AccountRole.WRITABLE },
      { address: bookkeepingAddress, role: AccountRole.WRITABLE },
      { address: currentExits, role: AccountRole.READONLY },
      { address: previousExits, role: AccountRole.READONLY },
      { address: currentPrices, role: AccountRole.WRITABLE },
      { address: previousPrices, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: getClosePricesAccountInstructionDataEncoder().encode({
      referenceIndex,
    }),
    programAddress: TWOB_ANCHOR_PROGRAM_ADDRESS,
  })
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

export function getReferenceIndex(
  currentSlot: number,
  endSlotInterval: bigint,
) {
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
    Math.floor((currentSlot + durationSlots + interval / 2) / interval) *
      interval,
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
    fetchBookkeeping(rpcClient, bookkeepingAddress, {
      commitment: 'confirmed',
    }),
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
  const endSlot = alignEndSlot(
    currentSlot,
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

      const futureIndex = getFutureIndex(
        tradePositionAccount.data.endSlot,
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

      return getAuthorityClosePositionInstructionAsync({
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
  const signerAddress = walletSigner.address
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
    }),
  )
  const pricesAccounts: Array<PricesRentAccount> = ownedPricesAccounts.map(
    (account) => ({
      address: account.address,
      index: account.data.index,
      lamports: account.lamports,
      openPositions: account.data.openPositions,
    }),
  )
  const indicesWithOpenPositions = new Set<bigint>(
    pricesAccounts
      .filter((account) => account.openPositions > 0n)
      .map((account) => account.index),
  )

  const referenceIndex = getReferenceIndex(
    Number(currentSlot),
    marketAccount.data.endSlotInterval,
  )
  if (referenceIndex <= 0n) {
    throw new Error('Reclaim rent is not available yet for this market.')
  }
  const previousIndex = getPreviousIndex(referenceIndex)

  const candidateAccounts = collectCloseableRentAccounts({
    currentSlot: Number(currentSlot),
    endSlotInterval: marketAccount.data.endSlotInterval,
    exitsAccounts,
    maxAccounts: exitsAccounts.length + pricesAccounts.length,
    pricesAccounts,
  })
  const closeableAccounts = candidateAccounts
    .filter((account) => account.index < previousIndex)
    .filter(
      (account) =>
        !(
          account.kind === 'exits' &&
          indicesWithOpenPositions.has(account.index)
        ),
    )
    .slice(0, Math.max(0, Math.floor(maxAccounts)))

  if (closeableAccounts.length === 0) {
    throw new Error('No reclaimable rent accounts available.')
  }
  const reclaimedLamports = closeableAccounts.reduce(
    (sum, account) => sum + account.lamports,
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
    closeableAccounts.map((account) => {
      if (account.kind === 'exits') {
        return buildCloseExitsAccountInstruction({
          bookkeepingAddress,
          currentExits,
          currentPrices,
          exitsAddress: account.address,
          marketAddress,
          ownerAddress,
          previousExits,
          previousPrices,
          referenceIndex,
          signerAddress,
        })
      }

      return buildClosePricesAccountInstruction({
        bookkeepingAddress,
        currentExits,
        currentPrices,
        marketAddress,
        ownerAddress,
        previousExits,
        previousPrices,
        pricesAddress: account.address,
        referenceIndex,
        signerAddress,
      })
    }),
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
