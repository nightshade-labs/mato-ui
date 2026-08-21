import type { Address } from '@solana/kit'

const SUPPORTED_MARKET_IDS = [1, 2, 3, 4] as const

export type MarketId = (typeof SUPPORTED_MARKET_IDS)[number]

export interface MarketDefinition {
  readonly id: MarketId
  readonly baseSymbol: string
  readonly quoteSymbol: string
  readonly baseMint: Address
  readonly quoteMint: Address
  readonly baseDecimals: number
  readonly quoteDecimals: number
  readonly minimumBaseDepositAtoms: bigint
  readonly minimumQuoteDepositAtoms: bigint
}

const DEVNET_USDC_MINT =
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' as Address

export const MARKET_DEFINITIONS = [
  {
    id: 1,
    baseSymbol: 'SOL',
    quoteSymbol: 'USDC',
    baseMint: 'So11111111111111111111111111111111111111112' as Address,
    quoteMint: DEVNET_USDC_MINT,
    baseDecimals: 9,
    quoteDecimals: 6,
    minimumBaseDepositAtoms: 1_000_000n,
    minimumQuoteDepositAtoms: 100_000n,
  },
  {
    id: 2,
    baseSymbol: 'MATO',
    quoteSymbol: 'USDC',
    baseMint: '69zmVXSzZptwJo5cy5LfUxmrdE1mRkeRnnEqtYNrKBMc' as Address,
    quoteMint: DEVNET_USDC_MINT,
    baseDecimals: 6,
    quoteDecimals: 6,
    minimumBaseDepositAtoms: 1_000n,
    minimumQuoteDepositAtoms: 100_000n,
  },
  {
    id: 3,
    baseSymbol: 'SB',
    quoteSymbol: 'USDC',
    baseMint: '5UodwdrKuvMkpYZqEAoeo5AbeX4fPzSeENEojJLZNUQR' as Address,
    quoteMint: DEVNET_USDC_MINT,
    baseDecimals: 6,
    quoteDecimals: 6,
    minimumBaseDepositAtoms: 1_000n,
    minimumQuoteDepositAtoms: 100_000n,
  },
  {
    id: 4,
    baseSymbol: 'SF',
    quoteSymbol: 'USDC',
    baseMint: 'HxMsRrwZdg6fBVcZ5aqP3x18KVpmNG81kSncrCD7k13N' as Address,
    quoteMint: DEVNET_USDC_MINT,
    baseDecimals: 6,
    quoteDecimals: 6,
    minimumBaseDepositAtoms: 1_000n,
    minimumQuoteDepositAtoms: 100_000n,
  },
] as const satisfies ReadonlyArray<MarketDefinition>

function parseSupportedMarketId(value: unknown): MarketId | null {
  const marketId =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : Number.NaN

  return SUPPORTED_MARKET_IDS.find((id) => id === marketId) ?? null
}

function readDefaultMarketId(): MarketId {
  const rawMarketId = import.meta.env.VITE_MARKET_ID ?? '1'
  const marketId = parseSupportedMarketId(rawMarketId)

  if (marketId === null) {
    throw new Error(
      `VITE_MARKET_ID must be one of ${SUPPORTED_MARKET_IDS.join(', ')}, got "${rawMarketId}"`,
    )
  }

  return marketId
}

export const DEFAULT_MARKET_ID = readDefaultMarketId()

export function getMarketDefinition(marketId: MarketId): MarketDefinition {
  const market = MARKET_DEFINITIONS.find(
    (definition) => definition.id === marketId,
  )
  if (!market) throw new Error(`Unsupported market id: ${marketId}`)
  return market
}

export function parseMarketSearch(value: unknown): { market: MarketId } {
  const candidate =
    value instanceof URLSearchParams
      ? value.getAll('market').length === 1
        ? value.get('market')
        : null
      : typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>).market
        : null

  return { market: parseSupportedMarketId(candidate) ?? DEFAULT_MARKET_ID }
}

export const ARRAY_LENGTH = 20
export const SLOT_DURATION_MS = 400
export const SLOT_DURATION_SECONDS = SLOT_DURATION_MS / 1000
export const NATIVE_SOL_DECIMALS = 9
export const NATIVE_FEE_BUFFER_ATOMS = 20_000_000n
export const MAINTENANCE_TRANSACTION_FEE_BUFFER_ATOMS = 1_000_000n
export const DEFAULT_MARKET_UPDATES_LIMIT = 200
export const CHART_HISTORY_REQUEST_BASE_THRESHOLD_BARS = 20
export const CHART_HISTORY_REQUEST_THRESHOLD_RATIO = 0.35
export const CHART_HISTORY_REQUEST_BUFFER_BARS = 24
export const CHART_HISTORY_REQUEST_MIN_BARS = 72
export const CHART_HISTORY_REQUEST_DEBOUNCE_MS = 450
export const CLOSED_POSITION_VISIBLE_ROW_OVERSCAN_PX = 480
export const CLOSED_POSITION_MAX_CONCURRENT_CHART_LOADS = 10
export const CLOSED_POSITION_BATCH_GAP_SLOTS = 900
// A v1 close uses 23 account metas; two self-custodied positions fit the wire limit.
export const MAX_BATCH_CLOSE_POSITIONS_PER_TRANSACTION = 2
export const MAX_RECLAIM_RENT_ACCOUNTS_PER_TRANSACTION = 10
export const POSITION_PAGE_SIZE = 10
export const HIGH_PRICE_IMPACT_WARNING_THRESHOLD_PERCENT = 1

export const DURATION_OPTIONS = [
  { label: '1m', seconds: 1 * 60 },
  { label: '5m', seconds: 5 * 60 },
  { label: '10m', seconds: 10 * 60 },
  { label: '30m', seconds: 30 * 60 },
  { label: '1h', seconds: 60 * 60 },
  { label: '2h', seconds: 2 * 60 * 60 },
  { label: '4h', seconds: 4 * 60 * 60 },
  { label: '12h', seconds: 12 * 60 * 60 },
  { label: '1d', seconds: 24 * 60 * 60 },
  { label: '3d', seconds: 3 * 24 * 60 * 60 },
  { label: '1w', seconds: 7 * 24 * 60 * 60 },
  { label: '1mo', seconds: 30 * 24 * 60 * 60 },
  { label: '3mo', seconds: 90 * 24 * 60 * 60 },
  { label: '6mo', seconds: 180 * 24 * 60 * 60 },
  { label: '1y', seconds: 365 * 24 * 60 * 60 },
] as const

export const CHART_TIMEFRAMES = [
  { label: '1m', intervalMs: 1 * 60 * 1000 },
  { label: '5m', intervalMs: 5 * 60 * 1000 },
  { label: '1h', intervalMs: 60 * 60 * 1000 },
] as const

export type ChartTimeframe = (typeof CHART_TIMEFRAMES)[number]['label']
export type OrderSide = 'buy' | 'sell'
export type MarketPanelTab = 'chart' | 'trades' | 'order-book'
export type PositionPanelTab = 'active' | 'closed'
