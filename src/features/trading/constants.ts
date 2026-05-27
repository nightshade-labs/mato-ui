export const MARKET_ID = Number(import.meta.env.VITE_MARKET_ID ?? '1')
export const ARRAY_LENGTH = 10
export const SLOT_DURATION_MS = 400
export const SLOT_DURATION_SECONDS = SLOT_DURATION_MS / 1000
export const NATIVE_FEE_BUFFER_ATOMS = 20_000_000n
export const MIN_TRADE_AMOUNT_ATOMS = 1_000_000n
export const DEFAULT_MARKET_UPDATES_LIMIT = 200
export const CHART_HISTORY_REQUEST_BASE_THRESHOLD_BARS = 20
export const CHART_HISTORY_REQUEST_THRESHOLD_RATIO = 0.35
export const CHART_HISTORY_REQUEST_BUFFER_BARS = 24
export const CHART_HISTORY_REQUEST_MIN_BARS = 72
export const CHART_HISTORY_REQUEST_DEBOUNCE_MS = 450
export const CLOSED_POSITION_INITIAL_VISIBLE_ROW_COUNT = 10
export const CLOSED_POSITION_VISIBLE_ROW_OVERSCAN_PX = 480
export const CLOSED_POSITION_MAX_CONCURRENT_CHART_LOADS = 10
export const CLOSED_POSITION_BATCH_GAP_SLOTS = 900
export const MAX_RECLAIM_RENT_ACCOUNTS_PER_TRANSACTION = 10

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
