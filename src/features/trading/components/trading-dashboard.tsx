import { useEffect, useMemo, useState } from 'react'
import { useWalletConnection, useWalletSession } from '@solana/react-hooks'
import {
  AlertTriangle,
  ChartCandlestick,
  ChartLine,
  ListOrdered,
  RefreshCcw,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  CHART_TIMEFRAMES,
  DEFAULT_MARKET_UPDATES_LIMIT,
  HIGH_PRICE_IMPACT_WARNING_THRESHOLD_PERCENT,
  MAINTENANCE_TRANSACTION_FEE_BUFFER_ATOMS,
  MAX_BATCH_CLOSE_POSITIONS_PER_TRANSACTION,
  NATIVE_FEE_BUFFER_ATOMS,
  NATIVE_SOL_DECIMALS,
  POSITION_PAGE_SIZE,
  getMarketDefinition,
} from '../constants'
import {
  atomsFromPercent,
  durationToSlots,
  formatAtomsToInput,
  isNativeBalanceBelowTransactionMinimum,
  parseTokenAmount,
  sanitizeAmountInput,
  toSliderPercent,
} from '../lib/amounts'
import {
  isEndedPosition,
  selectBatchClosePositions,
} from '../lib/batch-close-positions'
import {
  formatAtoms,
  formatExplorerTransactionUrl,
  formatUiAmount,
} from '../lib/format'
import { clampPage, getPageCount, getPageItems } from '../lib/pagination'
import { isHighPriceImpact } from '../lib/price-impact'
import { useMarketAddress } from '../hooks/use-market-address'
import { useMarketChartHistory } from '../hooks/use-market-chart-history'
import { useMarketPrice } from '../hooks/use-market-price'
import { useMarketPriceChange24h } from '../hooks/use-market-price-change'
import { useMarketUpdates } from '../hooks/use-market-updates'
import { useMarketTradePositions } from '../hooks/use-market-trade-positions'
import { useStreamingMarketState } from '../hooks/use-streaming-market-state'
import { useTradePositions } from '../hooks/use-trade-positions'
import { useWalletSolBalance } from '../hooks/use-wallet-sol-balance'
import { useWalletTokenBalance } from '../hooks/use-wallet-token-balance'
import { useSubmitOrder } from '../hooks/use-submit-order'
import { useClosePosition } from '../hooks/use-close-position'
import { usePositionControls } from '../hooks/use-position-controls'
import { useReclaimRent } from '../hooks/use-reclaim-rent'
import {
  buildTradingDashboardViewModel,
  formatDashboardPrice,
  selectReferenceMarketPricing,
} from '../view-models/trading-dashboard'
import { MarketPriceChart } from './market-price-chart'
import { OrderEntryCard } from './order-entry-card'
import { OrderBookTable } from './order-book-table'
import { ActivePositionCard } from './active-position-card'
import { ClosedPositionsList } from './closed-positions-list'
import { HighPriceImpactDialog } from './high-price-impact-dialog'
import { PositionPagination } from './position-pagination'
import { ReclaimRentBanner } from './reclaim-rent-banner'
import { MarketSelector } from './market-selector'
import type { ReactNode } from 'react'
import type {
  ChartCrosshairData,
  ChartDisplayMode,
  ChartHistoryRequest,
} from './market-price-chart'
import type { ChartPositionOverlay } from '../lib/chart-positions'
import type {
  ChartTimeframe,
  MarketId,
  MarketPanelTab,
  OrderSide,
  PositionPanelTab,
} from '../constants'
import type { TradePositionRecord } from '../domain/models'
import type { TradingViewAggregatedCandle } from '../lib/market'
import { endpoint } from '@/integrations/solana'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

const DEFAULT_VISIBLE_BARS_BY_TIMEFRAME: Record<ChartTimeframe, number> = {
  '1m': 120,
  '5m': 96,
  '1h': 72,
}
const CHART_DISPLAY_MODES = [
  { icon: ChartCandlestick, label: 'Candles', mode: 'candles' },
  { icon: ChartLine, label: 'Line', mode: 'line' },
] as const
const REFERENCE_PRICE_MARKET_ID: MarketId = 1
const REFERENCE_CHART_LABEL = 'SOL/USDC · Mainnet reference'
const MARKET_PANEL_TABS = [
  { icon: ChartCandlestick, label: 'Chart', tab: 'chart' },
  { icon: ListOrdered, label: 'Order book', tab: 'order-book' },
] as const satisfies Array<{
  icon: typeof ChartCandlestick
  label: string
  tab: MarketPanelTab
}>
export function TradingDashboard({
  marketId,
  onMarketChange,
}: {
  marketId: MarketId
  onMarketChange: (marketId: MarketId) => void
}) {
  const session = useWalletSession()
  const walletConnection = useWalletConnection()
  const address = session?.account.address.toString() ?? null
  const [marketPanelTab, setMarketPanelTab] = useState<MarketPanelTab>('chart')
  const selectedMarket = getMarketDefinition(marketId)

  const marketAddressQuery = useMarketAddress(marketId)
  const marketAddress = marketAddressQuery.data
  const marketPriceQuery = useMarketPrice(REFERENCE_PRICE_MARKET_ID)
  const marketPriceChange24hQuery = useMarketPriceChange24h(
    REFERENCE_PRICE_MARKET_ID,
  )
  const marketUpdates = useMarketUpdates({
    limit: DEFAULT_MARKET_UPDATES_LIMIT,
    marketId: REFERENCE_PRICE_MARKET_ID,
  })
  const streamingStateQuery = useStreamingMarketState(marketAddress)
  const tradePositionsQuery = useTradePositions(address, marketId)
  const shouldLoadOrderBookPositions = marketPanelTab === 'order-book'
  const orderBookPositionsQuery = useMarketTradePositions(
    marketAddress,
    marketId,
    shouldLoadOrderBookPositions,
  )

  const [side, setSide] = useState<OrderSide>('buy')
  const [amountInput, setAmountInput] = useState('')
  const [durationSeconds, setDurationSeconds] = useState(30 * 60)
  const [positionPanelTab, setPositionPanelTab] =
    useState<PositionPanelTab>('active')
  const [activePositionPage, setActivePositionPage] = useState(0)
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('5m')
  const [chartDisplayMode, setChartDisplayMode] =
    useState<ChartDisplayMode>('candles')
  const [chartResetSignal, setChartResetSignal] = useState(0)
  const [highPriceImpactDialogOpen, setHighPriceImpactDialogOpen] =
    useState(false)
  const [crosshairData, setCrosshairData] = useState<ChartCrosshairData | null>(
    null,
  )

  const submitOrder = useSubmitOrder()
  const closePosition = useClosePosition()
  const positionControls = usePositionControls()
  const reclaimRent = useReclaimRent(walletConnection.connected, marketId)

  const {
    baseDecimals,
    baseMint,
    baseSymbol: baseTicker,
    quoteDecimals,
    quoteMint,
    quoteSymbol: quoteTicker,
  } = selectedMarket
  const marketChartHistory = useMarketChartHistory({
    latestPrice: marketPriceQuery.data ?? null,
    marketId: REFERENCE_PRICE_MARKET_ID,
    timeframe: chartTimeframe,
  })

  const baseBalance = useWalletTokenBalance(baseMint, baseDecimals || 9)
  const quoteBalance = useWalletTokenBalance(quoteMint, quoteDecimals || 9)
  const nativeSolBalance = useWalletSolBalance()

  const selectedBalance = side === 'sell' ? baseBalance : quoteBalance
  const amountTokenTicker = side === 'sell' ? baseTicker : quoteTicker
  const amountDecimals = side === 'sell' ? baseDecimals : quoteDecimals
  const onChainMarket = streamingStateQuery.data ?? null
  const marketConfigurationMismatch = Boolean(
    onChainMarket &&
    (onChainMarket.marketId !== marketId ||
      onChainMarket.baseMint.toString() !== baseMint ||
      onChainMarket.quoteMint.toString() !== quoteMint),
  )
  const isMarketReady = Boolean(onChainMarket && !marketConfigurationMismatch)
  const isMarketPaused = onChainMarket?.isPaused ?? false
  const minimumTradeAmountAtoms =
    side === 'sell'
      ? (onChainMarket?.minimumBaseDepositAtoms ??
        selectedMarket.minimumBaseDepositAtoms)
      : (onChainMarket?.minimumQuoteDepositAtoms ??
        selectedMarket.minimumQuoteDepositAtoms)
  const availableAtoms = selectedBalance.spendableAtoms
  const amountAtoms = useMemo(
    () => parseTokenAmount(amountInput, amountDecimals),
    [amountDecimals, amountInput],
  )
  const sliderValue = useMemo(
    () => toSliderPercent(amountAtoms, availableAtoms),
    [amountAtoms, availableAtoms],
  )
  const amountExceedsAvailable =
    amountAtoms !== null && amountAtoms > availableAtoms
  const amountBelowMinimum =
    amountAtoms !== null &&
    amountAtoms > 0n &&
    amountAtoms < minimumTradeAmountAtoms
  const availableAmountDisplay = Number(availableAtoms) / 10 ** amountDecimals
  const minimumAmountDisplay = formatAtoms(
    minimumTradeAmountAtoms,
    amountDecimals,
  )
  const amountValidationMessage = amountExceedsAvailable
    ? `Amount exceeds available balance. You have ${formatUiAmount(
        availableAmountDisplay,
      )} ${amountTokenTicker}.`
    : amountBelowMinimum
      ? `Minimum order size is ${minimumAmountDisplay} ${amountTokenTicker}.`
      : null
  const hasLowSubmitNativeSolBalance =
    walletConnection.connected &&
    isNativeBalanceBelowTransactionMinimum(nativeSolBalance.lamports)
  const hasLowMaintenanceNativeSolBalance =
    walletConnection.connected &&
    isNativeBalanceBelowTransactionMinimum(
      nativeSolBalance.lamports,
      MAINTENANCE_TRANSACTION_FEE_BUFFER_ATOMS,
    )
  const requiredSubmitNativeSolDisplay = formatAtoms(
    NATIVE_FEE_BUFFER_ATOMS,
    NATIVE_SOL_DECIMALS,
  )
  const requiredMaintenanceNativeSolDisplay = formatAtoms(
    MAINTENANCE_TRANSACTION_FEE_BUFFER_ATOMS,
    NATIVE_SOL_DECIMALS,
  )
  const nativeSolBalanceDisplay =
    nativeSolBalance.lamports === null
      ? null
      : formatAtoms(nativeSolBalance.lamports, NATIVE_SOL_DECIMALS)
  const lowSubmitNativeSolWarning = hasLowSubmitNativeSolBalance
    ? `Your wallet has ${nativeSolBalanceDisplay} SOL. Add SOL before submitting orders; at least ${requiredSubmitNativeSolDisplay} SOL is required for fees and rent.`
    : null
  const lowMaintenanceNativeSolWarning = hasLowMaintenanceNativeSolBalance
    ? `Your wallet has ${nativeSolBalanceDisplay} SOL. Add SOL before updating positions; at least ${requiredMaintenanceNativeSolDisplay} SOL is required for fees.`
    : null
  const lowPositionRentNativeSolWarning = hasLowSubmitNativeSolBalance
    ? `Your wallet has ${nativeSolBalanceDisplay} SOL. Add SOL before updating this position; at least ${requiredSubmitNativeSolDisplay} SOL is required for fees and possible account rent.`
    : null
  const lowReclaimRentNativeSolWarning = hasLowMaintenanceNativeSolBalance
    ? `Your wallet has ${nativeSolBalanceDisplay} SOL. Add SOL before reclaiming rent; at least ${requiredMaintenanceNativeSolDisplay} SOL is required for fees.`
    : null

  const amountUiValue = useMemo(() => {
    if (!amountAtoms || amountAtoms <= 0n) return null
    return Number(amountAtoms) / 10 ** amountDecimals
  }, [amountAtoms, amountDecimals])

  const activePositions = useMemo<Array<TradePositionRecord>>(
    () => tradePositionsQuery.data ?? [],
    [tradePositionsQuery.data],
  )
  const orderBookPositions = useMemo<Array<TradePositionRecord>>(
    () => orderBookPositionsQuery.data ?? [],
    [orderBookPositionsQuery.data],
  )
  const activePositionPageCount = getPageCount(
    activePositions.length,
    POSITION_PAGE_SIZE,
  )
  const normalizedActivePositionPage = clampPage(
    activePositionPage,
    activePositions.length,
    POSITION_PAGE_SIZE,
  )
  const paginatedActivePositions = useMemo(
    () =>
      getPageItems({
        items: activePositions,
        page: normalizedActivePositionPage,
        pageSize: POSITION_PAGE_SIZE,
      }),
    [activePositions, normalizedActivePositionPage],
  )
  const currentSlot = streamingStateQuery.data?.currentSlot ?? null
  const isOrderBookLoading =
    shouldLoadOrderBookPositions && orderBookPositionsQuery.isLoading
  const activePositionError =
    tradePositionsQuery.error instanceof Error
      ? tradePositionsQuery.error.message
      : null
  const marketRuntimeError = marketConfigurationMismatch
    ? `Market #${marketId} does not match the verified devnet configuration.`
    : !onChainMarket && streamingStateQuery.error instanceof Error
      ? streamingStateQuery.error.message
      : null
  const chartPositionOverlays: Array<ChartPositionOverlay> = []
  const endedPositions = useMemo(
    () =>
      activePositions.filter((position) =>
        isEndedPosition(position, currentSlot),
      ),
    [activePositions, currentSlot],
  )
  const endedBatchPositions = useMemo(
    () =>
      selectBatchClosePositions({
        currentSlot,
        maxPositions: MAX_BATCH_CLOSE_POSITIONS_PER_TRANSACTION,
        mode: 'ended',
        positions: activePositions,
      }),
    [activePositions, currentSlot],
  )
  const allBatchPositions = useMemo(
    () =>
      selectBatchClosePositions({
        currentSlot,
        maxPositions: MAX_BATCH_CLOSE_POSITIONS_PER_TRANSACTION,
        mode: 'all',
        positions: activePositions,
      }),
    [activePositions, currentSlot],
  )
  const dashboardViewModel = useMemo(() => {
    const referencePricing = selectReferenceMarketPricing({
      chartCandles: marketChartHistory.candles,
      crosshairData,
      isReferenceMarket: marketId === REFERENCE_PRICE_MARKET_ID,
      marketPrice: marketPriceQuery.data ?? undefined,
      marketUpdates: marketUpdates.events,
      priceChangeHistory: marketPriceChange24hQuery.data ?? [],
    })

    return buildTradingDashboardViewModel({
      amountAtoms,
      amountUiValue,
      baseDecimals,
      baseTicker,
      chartCandles: referencePricing.chartCandles,
      crosshairData: referencePricing.crosshairData,
      durationSeconds,
      marketPrice: referencePricing.marketPrice,
      marketUpdates: referencePricing.marketUpdates,
      priceChangeHistory: referencePricing.priceChangeHistory,
      quoteDecimals,
      quoteTicker,
      side,
      streamingState: streamingStateQuery.data ?? null,
      tradePositions: activePositions,
    })
  }, [
    activePositions,
    amountAtoms,
    amountUiValue,
    baseDecimals,
    baseTicker,
    crosshairData,
    durationSeconds,
    marketChartHistory.candles,
    marketPriceQuery.data,
    marketPriceChange24hQuery.data,
    marketUpdates.events,
    marketId,
    quoteDecimals,
    quoteTicker,
    side,
    streamingStateQuery.data,
  ])
  const {
    displayPrice,
    estimatedConversionText,
    executionPriceDisplay,
    priceImpactPercent,
    priceImpactDisplay,
    priceChange24hDisplay,
    priceChange24hPercent,
  } = dashboardViewModel
  const chartCandles = marketChartHistory.candles
  const hasHighPriceImpact = isHighPriceImpact(priceImpactPercent)
  const highPriceImpactThresholdDisplay = `${HIGH_PRICE_IMPACT_WARNING_THRESHOLD_PERCENT}%`
  const priceImpactWarningText = hasHighPriceImpact
    ? `Price impact is above ${highPriceImpactThresholdDisplay}. Review the execution price before submitting.`
    : null

  const submitDisabled =
    !walletConnection.connected ||
    !marketAddress ||
    !isMarketReady ||
    isMarketPaused ||
    !amountAtoms ||
    amountAtoms <= 0n ||
    amountBelowMinimum ||
    amountExceedsAvailable ||
    hasLowSubmitNativeSolBalance ||
    submitOrder.isSubmitting

  const submitStatusLabel =
    submitOrder.status === 'building'
      ? 'Building order...'
      : submitOrder.status === 'wrapping'
        ? 'Wrapping SOL...'
        : submitOrder.status === 'submitting'
          ? 'Submitting order...'
          : amountExceedsAvailable
            ? 'Amount exceeds balance'
            : amountBelowMinimum
              ? 'Amount too small'
              : !isMarketReady
                ? marketRuntimeError
                  ? 'Market unavailable'
                  : 'Loading market...'
                : isMarketPaused
                  ? 'Market paused'
                  : hasLowSubmitNativeSolBalance
                    ? 'Add SOL to submit'
                    : hasHighPriceImpact
                      ? 'Review price impact'
                      : side === 'buy'
                        ? 'Submit buy order'
                        : 'Submit sell order'

  useEffect(() => {
    setAmountInput('')
    setActivePositionPage(0)
    setPositionPanelTab('active')
    setHighPriceImpactDialogOpen(false)
  }, [marketId])

  useEffect(() => {
    setActivePositionPage((current) =>
      clampPage(current, activePositions.length, POSITION_PAGE_SIZE),
    )
  }, [activePositions.length])

  useEffect(() => {
    if (!hasHighPriceImpact || submitDisabled) {
      setHighPriceImpactDialogOpen(false)
    }
  }, [hasHighPriceImpact, submitDisabled])

  useEffect(() => {
    const signature = submitOrder.signature
    if (submitOrder.status !== 'success' || !signature) return

    toast.success('Order submitted', {
      action: {
        label: 'View',
        onClick: () => {
          window.open(
            formatExplorerTransactionUrl(signature, endpoint),
            '_blank',
            'noopener,noreferrer',
          )
        },
      },
      description: 'The transaction was confirmed.',
      id: `submit-order-success-${signature}`,
    })
  }, [submitOrder.signature, submitOrder.status])

  useEffect(() => {
    if (!submitOrder.error) return

    toast.error('Order failed', {
      description: submitOrder.error,
      id: 'submit-order-error',
    })
  }, [submitOrder.error])

  useEffect(() => {
    const signature = closePosition.signature
    if (closePosition.status !== 'success' || !signature) return
    const closedCount = closePosition.closedCount

    toast.success(closedCount > 1 ? 'Positions closed' : 'Position closed', {
      action: {
        label: 'View',
        onClick: () => {
          window.open(
            formatExplorerTransactionUrl(signature, endpoint),
            '_blank',
            'noopener,noreferrer',
          )
        },
      },
      description:
        closedCount > 1
          ? `${closedCount} positions were closed.`
          : 'The close transaction was confirmed.',
      id: `close-position-success-${signature}`,
    })
  }, [closePosition.closedCount, closePosition.signature, closePosition.status])

  useEffect(() => {
    if (!closePosition.error) return

    toast.error('Close failed', {
      description: closePosition.error,
      id: 'close-position-error',
    })
  }, [closePosition.error])

  useEffect(() => {
    const signature = positionControls.signature
    const action = positionControls.action
    if (
      positionControls.status !== 'success' ||
      !signature ||
      action === null
    ) {
      return
    }

    const title =
      action === 'pause'
        ? 'Position paused'
        : action === 'resume'
          ? 'Position resumed'
          : 'Swapped funds withdrawn'
    const description =
      action === 'pause'
        ? 'The position has stopped streaming.'
        : action === 'resume'
          ? 'The position is streaming again.'
          : 'Available swapped funds were sent to the position receiver.'

    toast.success(title, {
      action: {
        label: 'View',
        onClick: () => {
          window.open(
            formatExplorerTransactionUrl(signature, endpoint),
            '_blank',
            'noopener,noreferrer',
          )
        },
      },
      description,
      id: `position-control-success-${signature}`,
    })
  }, [
    positionControls.action,
    positionControls.signature,
    positionControls.status,
  ])

  useEffect(() => {
    if (!positionControls.error) return

    const title =
      positionControls.action === 'withdraw'
        ? 'Withdraw failed'
        : 'Position update failed'
    toast.error(title, {
      description: positionControls.error,
      id: 'position-control-error',
    })
  }, [positionControls.action, positionControls.error])

  useEffect(() => {
    const signature = reclaimRent.signature
    if (reclaimRent.status !== 'success' || !signature) return

    toast.success('Rent reclaimed', {
      action: {
        label: 'View',
        onClick: () => {
          window.open(
            formatExplorerTransactionUrl(signature, endpoint),
            '_blank',
            'noopener,noreferrer',
          )
        },
      },
      description: `Reclaimed ${formatAtoms(
        reclaimRent.reclaimedLamports,
        NATIVE_SOL_DECIMALS,
      )} SOL.`,
      id: `reclaim-rent-success-${signature}`,
    })
  }, [reclaimRent.reclaimedLamports, reclaimRent.signature, reclaimRent.status])

  useEffect(() => {
    if (!reclaimRent.error) return

    toast.error('Rent reclaim failed', {
      description: reclaimRent.error,
      id: 'reclaim-rent-error',
    })
  }, [reclaimRent.error])

  const refreshBalances = async () => {
    await Promise.allSettled([
      baseBalance.refresh(),
      nativeSolBalance.refresh(),
      quoteBalance.refresh(),
    ])
  }

  const handleNeedOlderChartHistory = ({
    visibleBarCount,
  }: ChartHistoryRequest) => {
    void marketChartHistory.loadOlderHistory({
      visibleBarCount,
    })
  }

  const handleSliderChange = (percent: number) => {
    if (availableAtoms <= 0n) {
      setAmountInput('')
      return
    }

    const nextAmountAtoms = atomsFromPercent(availableAtoms, percent)
    setAmountInput(formatAtomsToInput(nextAmountAtoms, amountDecimals))
  }

  const handleSubmit = async () => {
    if (!marketAddress) {
      toast.error('Order not ready', {
        description: 'Market address is still loading.',
        id: 'order-validation',
      })
      return
    }
    if (!isMarketReady) {
      toast.error('Order not ready', {
        description: marketRuntimeError ?? 'Market data is still loading.',
        id: 'order-validation',
      })
      return
    }
    if (isMarketPaused) {
      toast.error('Order not ready', {
        description: 'This market is currently paused.',
        id: 'order-validation',
      })
      return
    }
    if (!amountAtoms || amountAtoms <= 0n) {
      toast.error('Order not ready', {
        description: `Enter a valid ${amountTokenTicker} amount.`,
        id: 'order-validation',
      })
      return
    }
    if (amountAtoms > availableAtoms) {
      toast.error('Order not ready', {
        description: `Amount exceeds available ${amountTokenTicker} balance.`,
        id: 'order-validation',
      })
      return
    }
    if (amountAtoms < minimumTradeAmountAtoms) {
      toast.error('Order not ready', {
        description: `Minimum order size is ${minimumAmountDisplay} ${amountTokenTicker}.`,
        id: 'order-validation',
      })
      return
    }
    if (lowSubmitNativeSolWarning) {
      toast.warning('Not enough SOL', {
        description: lowSubmitNativeSolWarning,
        id: 'order-validation',
      })
      return
    }

    const durationSlots = durationToSlots(durationSeconds)
    const success = await submitOrder.submitOrder({
      amount: amountAtoms,
      durationSlots,
      existingWrappedAtoms: selectedBalance.existingWrappedAtoms,
      id: crypto.getRandomValues(new Uint32Array(1))[0],
      inputMintAddress: side === 'buy' ? quoteMint : baseMint,
      isBuy: side === 'buy',
      marketAddress,
    })

    if (success) {
      setAmountInput('')
      await refreshBalances()
    }
  }

  const handleSubmitRequest = async () => {
    if (hasHighPriceImpact) {
      setHighPriceImpactDialogOpen(true)
      return
    }

    await handleSubmit()
  }

  const handleConfirmHighPriceImpact = async () => {
    setHighPriceImpactDialogOpen(false)
    await handleSubmit()
  }

  const handleBatchClosePositions = async ({
    positions,
    validationId,
  }: {
    positions: Array<TradePositionRecord>
    validationId: string
  }) => {
    if (!marketAddress) {
      toast.error('Positions not ready', {
        description: 'Market address is still loading.',
        id: validationId,
      })
      return
    }
    if (positions.length === 0) {
      toast.error('Positions not ready', {
        description: 'There are no matching positions to close.',
        id: validationId,
      })
      return
    }
    if (lowMaintenanceNativeSolWarning) {
      toast.warning('Not enough SOL', {
        description: lowMaintenanceNativeSolWarning,
        id: validationId,
      })
      return
    }

    const success = await closePosition.closePositions({
      marketAddress,
      tradePositionAddresses: positions.map((position) => position.address),
    })
    if (success) {
      await refreshBalances()
    }
  }

  const handleReclaimRent = async () => {
    if (lowReclaimRentNativeSolWarning) {
      toast.warning('Not enough SOL', {
        description: lowReclaimRentNativeSolWarning,
        id: 'reclaim-rent-validation',
      })
      return
    }

    const success = await reclaimRent.reclaimRent()
    if (success) {
      await nativeSolBalance.refresh()
    }
  }

  const isMarketChangeDisabled =
    submitOrder.isSubmitting ||
    closePosition.isClosing ||
    positionControls.isPending ||
    reclaimRent.isReclaiming

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] bg-[color:var(--color-page-bg)] text-foreground">
      <div className="relative mx-auto max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <h1 className="sr-only">
              Trade {baseTicker}/{quoteTicker}
            </h1>
            <MarketSelector
              disabled={isMarketChangeDisabled}
              marketId={marketId}
              onMarketChange={onMarketChange}
            />
            <span className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-accent-warm)] sm:text-2xl">
              {formatDashboardPrice(displayPrice)}
            </span>
            <PriceChangeBadge
              display={priceChange24hDisplay}
              value={priceChange24hPercent}
            />
          </div>
          <Drawer>
            <DrawerTrigger
              render={
                <Button
                  className="rounded-full xl:hidden"
                  size="sm"
                  variant="outline"
                />
              }
            >
              {marketPanelTab === 'chart' ? (
                <ChartCandlestick className="size-4" />
              ) : (
                <ListOrdered className="size-4" />
              )}
              {marketPanelTab === 'chart' ? 'Chart' : 'Orders'}
            </DrawerTrigger>
            <DrawerContent className="overflow-hidden xl:hidden">
              <DrawerHeader>
                <DrawerTitle>
                  {marketPanelTab === 'chart'
                    ? 'SOL/USDC reference chart'
                    : `${baseTicker}/${quoteTicker}`}
                </DrawerTitle>
                <DrawerDescription>
                  {marketPanelTab === 'chart' ? (
                    'Mainnet price history'
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{formatDashboardPrice(displayPrice)}</span>
                      <PriceChangeBadge
                        display={priceChange24hDisplay}
                        value={priceChange24hPercent}
                      />
                    </span>
                  )}
                </DrawerDescription>
              </DrawerHeader>
              <div className="min-w-0 space-y-4">
                <MarketPanelTabs
                  activeTab={marketPanelTab}
                  onTabChange={setMarketPanelTab}
                />
                {marketPanelTab === 'chart' ? (
                  <PriceChartPanel
                    chartCandles={chartCandles}
                    chartDisplayMode={chartDisplayMode}
                    chartHeight={360}
                    chartTimeframe={chartTimeframe}
                    hasMoreHistory={marketChartHistory.hasMoreHistory}
                    isLoadingMoreHistory={
                      marketChartHistory.isLoadingMoreHistory
                    }
                    isMarketUpdatesLoading={marketUpdates.isLoading}
                    marketChartHistoryError={marketChartHistory.error}
                    marketUpdatesError={marketUpdates.error}
                    onCrosshairMove={setCrosshairData}
                    onDisplayModeChange={setChartDisplayMode}
                    onNeedOlderHistory={handleNeedOlderChartHistory}
                    onReset={() =>
                      setChartResetSignal((previous) => previous + 1)
                    }
                    onTimeframeChange={setChartTimeframe}
                    positionOverlayError={null}
                    positionOverlays={chartPositionOverlays}
                    referenceLabel={REFERENCE_CHART_LABEL}
                    resetSignal={chartResetSignal}
                    statusMinHeightClassName="min-h-[360px]"
                  />
                ) : (
                  <OrderBookTable
                    baseDecimals={baseDecimals}
                    baseTicker={baseTicker}
                    currentSlot={currentSlot}
                    isLoading={isOrderBookLoading}
                    positions={orderBookPositions}
                    quoteDecimals={quoteDecimals}
                    quoteTicker={quoteTicker}
                  />
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {marketRuntimeError ? (
          <Alert className="mb-5 flex items-start gap-3 border-destructive/35 bg-destructive/10 text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Market #{marketId} is unavailable: {marketRuntimeError}
            </span>
          </Alert>
        ) : null}

        {lowSubmitNativeSolWarning ? (
          <Alert className="mb-5 flex items-start gap-3 border-warning/35 bg-warning/10 text-warning-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{lowSubmitNativeSolWarning}</span>
          </Alert>
        ) : null}

        <ReclaimRentBanner
          closeableCount={reclaimRent.closeableCount}
          isReclaiming={reclaimRent.isReclaiming}
          nativeSolWarning={lowReclaimRentNativeSolWarning}
          onReclaim={() => void handleReclaimRent()}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.95fr)]">
          <div className="space-y-6 xl:col-start-2 xl:row-start-1">
            <OrderEntryCard
              amountInput={amountInput}
              amountValidationMessage={amountValidationMessage}
              amountTokenTicker={amountTokenTicker}
              availableAmountDisplay={availableAmountDisplay}
              canSubmit={!submitDisabled}
              durationSeconds={durationSeconds}
              estimatedConversionText={estimatedConversionText}
              executionPriceDisplay={executionPriceDisplay}
              isConnected={walletConnection.connected}
              minimumAmountDisplay={minimumAmountDisplay}
              onAmountChange={(value) => {
                setAmountInput(sanitizeAmountInput(value))
              }}
              onDurationChange={setDurationSeconds}
              onMaxClick={() => handleSliderChange(100)}
              onPercentSelect={handleSliderChange}
              onSideChange={(nextSide) => {
                setSide(nextSide)
                setAmountInput('')
              }}
              onSliderChange={handleSliderChange}
              onSubmit={() => void handleSubmitRequest()}
              priceImpactDisplay={priceImpactDisplay}
              priceImpactWarningText={priceImpactWarningText}
              selectedPercent={sliderValue}
              side={side}
              statusLabel={submitStatusLabel}
            />
          </div>

          <div className="space-y-6 xl:col-start-1 xl:row-start-1">
            <Card className="hidden border-white/10 bg-black/15 xl:block">
              <CardContent className="space-y-4 p-4">
                <MarketPanelTabs
                  activeTab={marketPanelTab}
                  onTabChange={setMarketPanelTab}
                />
                {marketPanelTab === 'chart' ? (
                  <PriceChartPanel
                    chartCandles={chartCandles}
                    chartDisplayMode={chartDisplayMode}
                    chartTimeframe={chartTimeframe}
                    hasMoreHistory={marketChartHistory.hasMoreHistory}
                    isLoadingMoreHistory={
                      marketChartHistory.isLoadingMoreHistory
                    }
                    isMarketUpdatesLoading={marketUpdates.isLoading}
                    marketChartHistoryError={marketChartHistory.error}
                    marketUpdatesError={marketUpdates.error}
                    onCrosshairMove={setCrosshairData}
                    onDisplayModeChange={setChartDisplayMode}
                    onNeedOlderHistory={handleNeedOlderChartHistory}
                    onReset={() =>
                      setChartResetSignal((previous) => previous + 1)
                    }
                    onTimeframeChange={setChartTimeframe}
                    positionOverlayError={null}
                    positionOverlays={chartPositionOverlays}
                    referenceLabel={REFERENCE_CHART_LABEL}
                    resetSignal={chartResetSignal}
                  />
                ) : (
                  <OrderBookTable
                    baseDecimals={baseDecimals}
                    baseTicker={baseTicker}
                    currentSlot={currentSlot}
                    isLoading={isOrderBookLoading}
                    positions={orderBookPositions}
                    quoteDecimals={quoteDecimals}
                    quoteTicker={quoteTicker}
                  />
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(['active', 'closed'] as const).map((tab) => (
                    <Button
                      key={tab}
                      className="rounded-full"
                      onClick={() => setPositionPanelTab(tab)}
                      size="xs"
                      variant={positionPanelTab === tab ? 'default' : 'outline'}
                    >
                      {tab === 'active'
                        ? 'Active positions'
                        : 'Closed positions'}
                    </Button>
                  ))}
                </div>

                {positionPanelTab === 'active' && activePositions.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="rounded-full"
                      disabled={
                        closePosition.isClosing ||
                        positionControls.isPending ||
                        endedBatchPositions.length === 0
                      }
                      onClick={() => {
                        void handleBatchClosePositions({
                          positions: endedBatchPositions,
                          validationId: 'batch-close-ended-validation',
                        })
                      }}
                      size="xs"
                      variant="outline"
                    >
                      <X className="size-3.5" />
                      Close ended
                      {formatBatchCloseCount(
                        endedBatchPositions.length,
                        endedPositions.length,
                      )}
                    </Button>
                    <Button
                      className="rounded-full"
                      disabled={
                        closePosition.isClosing ||
                        positionControls.isPending ||
                        allBatchPositions.length === 0
                      }
                      onClick={() => {
                        void handleBatchClosePositions({
                          positions: allBatchPositions,
                          validationId: 'batch-close-all-validation',
                        })
                      }}
                      size="xs"
                      variant="outline"
                    >
                      <X className="size-3.5" />
                      Close all
                      {formatBatchCloseCount(
                        allBatchPositions.length,
                        activePositions.length,
                      )}
                    </Button>
                  </div>
                ) : null}
              </div>

              {positionPanelTab === 'active' ? (
                !address ? (
                  <EmptyState copy="Connect a wallet to load your active positions." />
                ) : tradePositionsQuery.isLoading &&
                  activePositions.length === 0 ? (
                  <EmptyState copy="Loading active positions..." />
                ) : activePositionError && activePositions.length === 0 ? (
                  <EmptyState
                    copy={`Active positions unavailable: ${activePositionError}`}
                  />
                ) : activePositions.length > 0 && !marketAddress ? (
                  <EmptyState copy="Loading market address..." />
                ) : activePositions.length > 0 && marketAddress ? (
                  <div className="grid gap-4">
                    {paginatedActivePositions.map((position) => (
                      <ActivePositionCard
                        key={position.address}
                        baseDecimals={baseDecimals}
                        baseTicker={baseTicker}
                        isCloseDisabled={
                          closePosition.isClosing || positionControls.isPending
                        }
                        isClosing={closePosition.isClosingPosition(
                          position.address,
                        )}
                        isControlDisabled={
                          closePosition.isClosing || positionControls.isPending
                        }
                        isPausing={positionControls.isPendingAction(
                          position.address,
                          'pause',
                        )}
                        isResuming={positionControls.isPendingAction(
                          position.address,
                          'resume',
                        )}
                        isWithdrawing={positionControls.isPendingAction(
                          position.address,
                          'withdraw',
                        )}
                        marketAddress={marketAddress}
                        onClose={async (tradePositionAddress) => {
                          if (lowMaintenanceNativeSolWarning) {
                            toast.warning('Not enough SOL', {
                              description: lowMaintenanceNativeSolWarning,
                              id: 'close-position-validation',
                            })
                            return
                          }

                          const success = await closePosition.closePosition({
                            marketAddress,
                            tradePositionAddress,
                          })
                          if (success) {
                            await refreshBalances()
                          }
                        }}
                        onPauseToggle={async (tradePositionAddress) => {
                          const isPaused = position.data.pausedAtSlot > 0n
                          const balanceWarning = isPaused
                            ? lowPositionRentNativeSolWarning
                            : lowMaintenanceNativeSolWarning
                          if (balanceWarning) {
                            toast.warning('Not enough SOL', {
                              description: balanceWarning,
                              id: 'position-control-validation',
                            })
                            return
                          }

                          const success = isPaused
                            ? await positionControls.resumePosition({
                                marketAddress,
                                tradePositionAddress,
                              })
                            : await positionControls.pausePosition({
                                marketAddress,
                                tradePositionAddress,
                              })
                          if (success) {
                            await refreshBalances()
                          }
                        }}
                        onWithdraw={async (tradePositionAddress) => {
                          if (lowPositionRentNativeSolWarning) {
                            toast.warning('Not enough SOL', {
                              description: lowPositionRentNativeSolWarning,
                              id: 'position-control-validation',
                            })
                            return
                          }

                          const success =
                            await positionControls.withdrawSwapped({
                              marketAddress,
                              tradePositionAddress,
                            })
                          if (success) {
                            await refreshBalances()
                          }
                        }}
                        position={position}
                        quoteDecimals={quoteDecimals}
                        quoteTicker={quoteTicker}
                        streamingState={streamingStateQuery.data ?? null}
                      />
                    ))}
                    <PositionPagination
                      itemLabel="positions"
                      onPageChange={setActivePositionPage}
                      page={normalizedActivePositionPage}
                      pageCount={activePositionPageCount}
                      pageSize={POSITION_PAGE_SIZE}
                      totalItems={activePositions.length}
                    />
                  </div>
                ) : (
                  <EmptyState copy="Your active positions will appear here once an order is live." />
                )
              ) : address ? (
                <ClosedPositionsList
                  key={marketId}
                  baseDecimals={baseDecimals}
                  baseTicker={baseTicker}
                  marketId={marketId}
                  positionAuthority={address}
                  priceHistoryAvailable={marketId === REFERENCE_PRICE_MARKET_ID}
                  quoteDecimals={quoteDecimals}
                  quoteTicker={quoteTicker}
                />
              ) : (
                <EmptyState copy="Connect a wallet to load your closed positions." />
              )}
            </div>
          </div>
        </div>
      </div>
      <HighPriceImpactDialog
        estimatedConversionText={estimatedConversionText}
        executionPriceDisplay={executionPriceDisplay}
        isSubmitting={submitOrder.isSubmitting}
        onConfirm={() => void handleConfirmHighPriceImpact()}
        onOpenChange={setHighPriceImpactDialogOpen}
        open={highPriceImpactDialogOpen}
        priceImpactDisplay={priceImpactDisplay}
        thresholdDisplay={highPriceImpactThresholdDisplay}
      />
    </div>
  )
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <Card className="border-white/10 bg-black/20">
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        {copy}
      </CardContent>
    </Card>
  )
}

function PriceChangeBadge({
  display,
  value,
}: {
  display: string
  value: number | null
}) {
  const variant =
    value === null || value === 0
      ? 'muted'
      : value > 0
        ? 'positive'
        : 'negative'

  return (
    <Badge className="normal-case tracking-normal" variant={variant}>
      {display}
    </Badge>
  )
}

function MarketPanelTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: MarketPanelTab
  onTabChange: (tab: MarketPanelTab) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {MARKET_PANEL_TABS.map(({ icon: Icon, label, tab }) => (
        <Button
          aria-pressed={activeTab === tab}
          className="rounded-full"
          key={tab}
          onClick={() => onTabChange(tab)}
          size="xs"
          variant={activeTab === tab ? 'default' : 'outline'}
        >
          <Icon className="size-3.5" />
          {label}
        </Button>
      ))}
    </div>
  )
}

function PriceChartPanel({
  chartCandles,
  chartDisplayMode,
  chartHeight = 420,
  chartTimeframe,
  className,
  hasMoreHistory,
  isLoadingMoreHistory,
  isMarketUpdatesLoading,
  marketChartHistoryError,
  marketUpdatesError,
  onCrosshairMove,
  onDisplayModeChange,
  onNeedOlderHistory,
  onReset,
  onTimeframeChange,
  positionOverlayError,
  positionOverlays,
  referenceLabel,
  resetSignal,
  statusMinHeightClassName = 'min-h-[420px]',
}: {
  chartCandles: Array<TradingViewAggregatedCandle>
  chartDisplayMode: ChartDisplayMode
  chartHeight?: number
  chartTimeframe: ChartTimeframe
  className?: string
  hasMoreHistory: boolean
  isLoadingMoreHistory: boolean
  isMarketUpdatesLoading: boolean
  marketChartHistoryError: string | null
  marketUpdatesError: string | null
  onCrosshairMove: (value: ChartCrosshairData | null) => void
  onDisplayModeChange: (mode: ChartDisplayMode) => void
  onNeedOlderHistory: (request: ChartHistoryRequest) => void
  onReset: () => void
  onTimeframeChange: (timeframe: ChartTimeframe) => void
  positionOverlayError: string | null
  positionOverlays: Array<ChartPositionOverlay>
  referenceLabel: string
  resetSignal: number
  statusMinHeightClassName?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="muted">{referenceLabel}</Badge>
          <div className="flex flex-wrap gap-2">
            {CHART_TIMEFRAMES.map((timeframe) => (
              <Button
                key={timeframe.label}
                className="rounded-full"
                onClick={() => onTimeframeChange(timeframe.label)}
                size="xs"
                variant={
                  chartTimeframe === timeframe.label ? 'default' : 'outline'
                }
              >
                {timeframe.label}
              </Button>
            ))}
          </div>
          <div className="flex rounded-full border border-white/10 bg-white/5 p-0.5">
            {CHART_DISPLAY_MODES.map(({ icon: Icon, label, mode }) => (
              <Button
                key={mode}
                aria-pressed={chartDisplayMode === mode}
                className="rounded-full"
                onClick={() => onDisplayModeChange(mode)}
                size="xs"
                variant={chartDisplayMode === mode ? 'default' : 'ghost'}
              >
                <Icon className="size-3.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>
        <Button
          className="rounded-full"
          onClick={onReset}
          size="xs"
          variant="outline"
        >
          <RefreshCcw className="size-3.5" />
          Reset
        </Button>
      </div>

      {isMarketUpdatesLoading && chartCandles.length === 0 ? (
        <ChartState className={statusMinHeightClassName}>
          Loading market history...
        </ChartState>
      ) : chartCandles.length === 0 ? (
        <ChartState className={statusMinHeightClassName}>
          Not enough market updates to render the chart yet.
        </ChartState>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),rgba(255,255,255,0)_55%)]">
          <MarketPriceChart
            defaultVisibleBars={
              DEFAULT_VISIBLE_BARS_BY_TIMEFRAME[chartTimeframe]
            }
            data={chartCandles}
            displayMode={chartDisplayMode}
            hasMoreHistory={hasMoreHistory}
            height={chartHeight}
            isLoadingMoreHistory={isLoadingMoreHistory}
            onCrosshairMove={onCrosshairMove}
            onNeedOlderHistory={onNeedOlderHistory}
            positionOverlays={positionOverlays}
            resetSignal={resetSignal}
            viewportPresetKey={chartTimeframe}
          />
        </div>
      )}

      {marketUpdatesError ? (
        <p className="text-sm text-destructive">{marketUpdatesError}</p>
      ) : null}
      {marketChartHistoryError ? (
        <p className="text-sm text-destructive">{marketChartHistoryError}</p>
      ) : null}
      {positionOverlayError ? (
        <p className="text-sm text-destructive">
          Position history unavailable: {positionOverlayError}
        </p>
      ) : null}
    </div>
  )
}

function ChartState({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-[1.5rem] border border-white/8 bg-white/5 text-center text-sm text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  )
}

function formatBatchCloseCount(selectedCount: number, totalCount: number) {
  if (totalCount <= 0) return ''
  if (selectedCount >= totalCount) return ` (${totalCount})`
  return ` (${selectedCount}/${totalCount})`
}
