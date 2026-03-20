import type { MarketConfigRow, MarketUpdateEvent } from '@/integrations/supabase'
import type {
  ChartTimeframe,
  OrderSide,
} from '../constants'
import { CHART_TIMEFRAMES, SLOT_DURATION_MS } from '../constants'
import { durationToSlots } from '../lib/amounts'
import type {
  StreamingMarketState,
  TradePositionRecord,
} from '../domain/models'
import {
  aggregateTradingViewCandles,
  computeMarketStats,
  marketPriceFromFlows,
} from '../lib/market'
import {
  formatCrosshairTimeLabel,
  formatPrice,
  formatUiAmount,
  shortenAddress,
} from '../lib/format'

export interface DashboardChartFocus {
  close: number
  high: number
  low: number
  open: number
  time: number
  volume: number | null
}

export interface TradingMarketIdentity {
  baseDecimals: number
  baseMint: string | null
  baseTicker: string
  quoteDecimals: number
  quoteMint: string | null
  quoteTicker: string
}

function resolveTicker(
  mint: string | null | undefined,
  ticker: string | null | undefined,
  fallback: string,
) {
  return (
    ticker?.toUpperCase() ??
    (mint ? shortenAddress(mint, 4, 4).toUpperCase() : fallback)
  )
}

export function deriveMarketIdentity(
  marketConfig: MarketConfigRow | null | undefined,
): TradingMarketIdentity {
  const baseMint = marketConfig?.base_mint ?? null
  const quoteMint = marketConfig?.quote_mint ?? null

  return {
    baseDecimals: marketConfig?.base_decimals ?? 0,
    baseMint,
    baseTicker: resolveTicker(baseMint, marketConfig?.base_ticker, 'BASE'),
    quoteDecimals: marketConfig?.quote_decimals ?? 0,
    quoteMint,
    quoteTicker: resolveTicker(quoteMint, marketConfig?.quote_ticker, 'QUOTE'),
  }
}

export function buildTradingDashboardViewModel({
  amountAtoms,
  amountUiValue,
  baseDecimals,
  baseTicker,
  chartTimeframe,
  crosshairData,
  durationSeconds,
  marketPrice,
  marketUpdates,
  quoteDecimals,
  quoteTicker,
  side,
  streamingState,
  tradePositions,
}: {
  amountAtoms: bigint | null
  amountUiValue: number | null
  baseDecimals: number
  baseTicker: string
  chartTimeframe: ChartTimeframe
  crosshairData: DashboardChartFocus | null
  durationSeconds: number
  marketPrice?: { price: number | null; slot: number | null }
  marketUpdates: MarketUpdateEvent[]
  quoteDecimals: number
  quoteTicker: string
  side: OrderSide
  streamingState: StreamingMarketState | null | undefined
  tradePositions: TradePositionRecord[]
}) {
  const chartIntervalMs =
    CHART_TIMEFRAMES.find((option) => option.label === chartTimeframe)
      ?.intervalMs ?? 60 * 60 * 1000

  const chartCandles = aggregateTradingViewCandles(
    marketUpdates,
    chartIntervalMs,
    baseDecimals,
    quoteDecimals,
    SLOT_DURATION_MS,
  )

  const latestChartCandle = chartCandles[chartCandles.length - 1] ?? null
  const recentTickPrices = marketUpdates
    .slice(0, 2)
    .map((event) =>
      marketPriceFromFlows(
        event.base_flow,
        event.quote_flow,
        baseDecimals,
        quoteDecimals,
      ),
    )
    .filter((value): value is number => value !== null)

  const latestTickPrice = recentTickPrices[0] ?? null
  const previousTickPrice = recentTickPrices[1] ?? null
  const onChainIndicativePrice = streamingState
    ? marketPriceFromFlows(
        streamingState.marketBaseFlow,
        streamingState.marketQuoteFlow,
        baseDecimals,
        quoteDecimals,
      )
    : null

  const displayPrice =
    marketPrice?.price ??
    latestTickPrice ??
    onChainIndicativePrice ??
    latestChartCandle?.close ??
    null

  const priceDelta =
    latestTickPrice !== null && previousTickPrice !== null
      ? latestTickPrice - previousTickPrice
      : latestChartCandle
        ? latestChartCandle.close - latestChartCandle.open
        : null

  const priceDeltaPercent =
    priceDelta !== null && displayPrice !== null && displayPrice > 0
      ? (priceDelta / displayPrice) * 100
      : null

  const marketStats = computeMarketStats(
    marketUpdates,
    baseDecimals,
    quoteDecimals,
  )

  const priceImpactPercent = (() => {
    if (!amountAtoms || amountAtoms <= 0n || !streamingState) return null

    const slots = durationToSlots(durationSeconds)
    const userFlowPerSlot = amountAtoms / BigInt(slots)
    if (userFlowPerSlot <= 0n) return null

    if (side === 'buy') {
      if (streamingState.marketQuoteFlow <= 0n) return null
      return (
        (Number(userFlowPerSlot) /
          (Number(streamingState.marketQuoteFlow) / 1_000_000_000)) *
        100
      )
    }

    if (streamingState.marketBaseFlow <= 0n) return null
    return (
      (Number(userFlowPerSlot) /
        (Number(streamingState.marketBaseFlow) / 1_000_000_000 +
          Number(userFlowPerSlot))) *
      100
    )
  })()

  const signedPriceImpactPercent =
    priceImpactPercent === null
      ? null
      : side === 'buy'
        ? priceImpactPercent
        : -priceImpactPercent

  const executionPrice = (() => {
    if (displayPrice === null || displayPrice <= 0) return null
    if (signedPriceImpactPercent === null) return displayPrice

    const nextPrice = displayPrice * (1 + signedPriceImpactPercent / 100)
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) return null
    return nextPrice
  })()

  const estimatedConversionText = (() => {
    if (amountUiValue === null || !executionPrice || executionPrice <= 0) {
      return `0 ${side === 'buy' ? baseTicker : quoteTicker}`
    }

    if (side === 'buy') {
      return `~${formatUiAmount(amountUiValue / executionPrice)} ${baseTicker}`
    }

    return `~${formatUiAmount(amountUiValue * executionPrice)} ${quoteTicker}`
  })()

  const activeOhlcv = crosshairData ?? latestChartCandle

  return {
    activeOhlcv,
    activeOhlcvTimeLabel: formatCrosshairTimeLabel(activeOhlcv?.time ?? null),
    activePositions: tradePositions,
    chartCandles,
    chartIntervalMs,
    displayPrice,
    estimatedConversionText,
    executionPrice,
    executionPriceDisplay:
      executionPrice === null ? '—' : `$${formatUiAmount(executionPrice)}`,
    latestChartCandle,
    latestTickPrice,
    marketStats,
    onChainIndicativePrice,
    priceDelta,
    priceDeltaPercent,
    priceImpactDisplay:
      priceImpactPercent === null
        ? '0%'
        : `${priceImpactPercent < 0.001 ? '<0.001' : priceImpactPercent.toFixed(3)}%`,
    priceImpactPercent,
    signedPriceImpactPercent,
  }
}

export function formatDashboardPrice(value: number | null) {
  return value === null ? '—' : `$${formatPrice(value)}`
}
