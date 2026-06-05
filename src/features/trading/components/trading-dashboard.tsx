import { useEffect, useMemo, useState } from 'react'
import { useWalletConnection, useWalletSession } from '@solana/react-hooks'
import { AlertTriangle, ChartCandlestick, RefreshCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  CHART_TIMEFRAMES,
  DEFAULT_MARKET_UPDATES_LIMIT,
  HIGH_PRICE_IMPACT_WARNING_THRESHOLD_PERCENT,
  MAINTENANCE_TRANSACTION_FEE_BUFFER_ATOMS,
  MARKET_ID,
  MAX_BATCH_CLOSE_POSITIONS_PER_TRANSACTION,
  MIN_TRADE_AMOUNT_ATOMS,
  NATIVE_FEE_BUFFER_ATOMS,
  NATIVE_SOL_DECIMALS,
  POSITION_PAGE_SIZE,
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
import { useMarketConfig } from '../hooks/use-market-config'
import { useMarketPrice } from '../hooks/use-market-price'
import { useMarketUpdates } from '../hooks/use-market-updates'
import { useStreamingMarketState } from '../hooks/use-streaming-market-state'
import { useTradePositions } from '../hooks/use-trade-positions'
import { useWalletSolBalance } from '../hooks/use-wallet-sol-balance'
import { useWalletTokenBalance } from '../hooks/use-wallet-token-balance'
import { useSubmitOrder } from '../hooks/use-submit-order'
import { useClosePosition } from '../hooks/use-close-position'
import { useReclaimRent } from '../hooks/use-reclaim-rent'
import {
  buildTradingDashboardViewModel,
  deriveMarketIdentity,
  formatDashboardPrice,
} from '../view-models/trading-dashboard'
import { MarketPriceChart } from './market-price-chart'
import { OrderEntryCard } from './order-entry-card'
import { ActivePositionCard } from './active-position-card'
import { ClosedPositionsList } from './closed-positions-list'
import { HighPriceImpactDialog } from './high-price-impact-dialog'
import { PositionPagination } from './position-pagination'
import { ReclaimRentBanner } from './reclaim-rent-banner'
import type { ReactNode } from 'react'
import type {
  ChartCrosshairData,
  ChartHistoryRequest,
} from './market-price-chart'
import type { ChartTimeframe, OrderSide, PositionPanelTab } from '../constants'
import type { TradePositionRecord } from '../domain/models'
import type { TradingViewAggregatedCandle } from '../lib/market'
import { endpoint } from '@/integrations/solana'
import { Alert } from '@/components/ui/alert'
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

export function TradingDashboard() {
  const session = useWalletSession()
  const walletConnection = useWalletConnection()
  const address = session?.account.address.toString() ?? null

  const marketAddressQuery = useMarketAddress(MARKET_ID)
  const marketAddress = marketAddressQuery.data
  const marketConfigQuery = useMarketConfig(MARKET_ID)
  const marketConfig = marketConfigQuery.data ?? null
  const marketPriceQuery = useMarketPrice(MARKET_ID)
  const marketUpdates = useMarketUpdates({
    limit: DEFAULT_MARKET_UPDATES_LIMIT,
    marketId: MARKET_ID,
  })
  const streamingStateQuery = useStreamingMarketState(marketAddress)
  const tradePositionsQuery = useTradePositions(address)

  const [side, setSide] = useState<OrderSide>('buy')
  const [amountInput, setAmountInput] = useState('')
  const [durationSeconds, setDurationSeconds] = useState(30 * 60)
  const [positionPanelTab, setPositionPanelTab] =
    useState<PositionPanelTab>('active')
  const [activePositionPage, setActivePositionPage] = useState(0)
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('5m')
  const [chartResetSignal, setChartResetSignal] = useState(0)
  const [highPriceImpactDialogOpen, setHighPriceImpactDialogOpen] =
    useState(false)
  const [crosshairData, setCrosshairData] = useState<ChartCrosshairData | null>(
    null,
  )

  const submitOrder = useSubmitOrder()
  const closePosition = useClosePosition()
  const reclaimRent = useReclaimRent(walletConnection.connected)

  const {
    baseDecimals,
    baseMint,
    baseTicker,
    quoteDecimals,
    quoteMint,
    quoteTicker,
  } = useMemo(() => deriveMarketIdentity(marketConfig), [marketConfig])
  const marketChartHistory = useMarketChartHistory({
    latestPrice: marketPriceQuery.data ?? null,
    marketId: MARKET_ID,
    timeframe: chartTimeframe,
  })

  const baseBalance = useWalletTokenBalance(baseMint, baseDecimals || 9)
  const quoteBalance = useWalletTokenBalance(quoteMint, quoteDecimals || 9)
  const nativeSolBalance = useWalletSolBalance()

  const selectedBalance = side === 'sell' ? baseBalance : quoteBalance
  const amountTokenTicker = side === 'sell' ? baseTicker : quoteTicker
  const amountDecimals = side === 'sell' ? baseDecimals : quoteDecimals
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
    amountAtoms < MIN_TRADE_AMOUNT_ATOMS
  const availableAmountDisplay = Number(availableAtoms) / 10 ** amountDecimals
  const minimumAmountDisplay = formatAtoms(
    MIN_TRADE_AMOUNT_ATOMS,
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
    ? `Your wallet has ${nativeSolBalanceDisplay} SOL. Add SOL before closing positions; at least ${requiredMaintenanceNativeSolDisplay} SOL is required for fees.`
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
  const dashboardViewModel = useMemo(
    () =>
      buildTradingDashboardViewModel({
        amountAtoms,
        amountUiValue,
        baseDecimals,
        baseTicker,
        chartCandles: marketChartHistory.candles,
        crosshairData,
        durationSeconds,
        marketPrice: marketPriceQuery.data,
        marketUpdates: marketUpdates.events,
        quoteDecimals,
        quoteTicker,
        side,
        streamingState: streamingStateQuery.data ?? null,
        tradePositions: activePositions,
      }),
    [
      activePositions,
      amountAtoms,
      amountUiValue,
      baseDecimals,
      baseTicker,
      crosshairData,
      durationSeconds,
      marketChartHistory.candles,
      marketPriceQuery.data,
      marketUpdates.events,
      quoteDecimals,
      quoteTicker,
      side,
      streamingStateQuery.data,
    ],
  )
  const {
    chartCandles,
    displayPrice,
    estimatedConversionText,
    executionPriceDisplay,
    priceImpactPercent,
    priceImpactDisplay,
  } = dashboardViewModel
  const hasHighPriceImpact = isHighPriceImpact(priceImpactPercent)
  const highPriceImpactThresholdDisplay = `${HIGH_PRICE_IMPACT_WARNING_THRESHOLD_PERCENT}%`
  const priceImpactWarningText = hasHighPriceImpact
    ? `Price impact is above ${highPriceImpactThresholdDisplay}. Review the execution price before submitting.`
    : null

  const submitDisabled =
    !walletConnection.connected ||
    !marketAddress ||
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
              : hasLowSubmitNativeSolBalance
                ? 'Add SOL to submit'
                : hasHighPriceImpact
                  ? 'Review price impact'
                  : side === 'buy'
                    ? 'Submit buy order'
                    : 'Submit sell order'

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
    if (amountAtoms < MIN_TRADE_AMOUNT_ATOMS) {
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
      id: BigInt(Date.now()),
      inputMintAddress: side === 'buy' ? (quoteMint ?? '') : (baseMint ?? ''),
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

  return (
    <div className="relative min-h-screen bg-[color:var(--color-page-bg)] text-foreground">
      <div className="relative mx-auto max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
              {baseTicker}/{quoteTicker}
            </h1>
            <span className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-accent-strong)] sm:text-2xl">
              {formatDashboardPrice(displayPrice)}
            </span>
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
              <ChartCandlestick className="size-4" />
              Chart
            </DrawerTrigger>
            <DrawerContent className="xl:hidden">
              <DrawerHeader>
                <DrawerTitle>
                  {baseTicker}/{quoteTicker} price chart
                </DrawerTitle>
                <DrawerDescription>
                  {formatDashboardPrice(displayPrice)}
                </DrawerDescription>
              </DrawerHeader>
              <PriceChartPanel
                chartCandles={chartCandles}
                chartHeight={360}
                chartTimeframe={chartTimeframe}
                hasMoreHistory={marketChartHistory.hasMoreHistory}
                isLoadingMoreHistory={marketChartHistory.isLoadingMoreHistory}
                isMarketUpdatesLoading={marketUpdates.isLoading}
                marketAddressError={
                  marketAddressQuery.error instanceof Error
                    ? marketAddressQuery.error.message
                    : null
                }
                marketChartHistoryError={marketChartHistory.error}
                marketUpdatesError={marketUpdates.error}
                onCrosshairMove={setCrosshairData}
                onNeedOlderHistory={handleNeedOlderChartHistory}
                onReset={() => setChartResetSignal((previous) => previous + 1)}
                onTimeframeChange={setChartTimeframe}
                resetSignal={chartResetSignal}
                statusMinHeightClassName="min-h-[360px]"
              />
            </DrawerContent>
          </Drawer>
        </div>

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
              <CardContent className="p-4">
                <PriceChartPanel
                  chartCandles={chartCandles}
                  chartTimeframe={chartTimeframe}
                  hasMoreHistory={marketChartHistory.hasMoreHistory}
                  isLoadingMoreHistory={marketChartHistory.isLoadingMoreHistory}
                  isMarketUpdatesLoading={marketUpdates.isLoading}
                  marketAddressError={
                    marketAddressQuery.error instanceof Error
                      ? marketAddressQuery.error.message
                      : null
                  }
                  marketChartHistoryError={marketChartHistory.error}
                  marketUpdatesError={marketUpdates.error}
                  onCrosshairMove={setCrosshairData}
                  onNeedOlderHistory={handleNeedOlderChartHistory}
                  onReset={() =>
                    setChartResetSignal((previous) => previous + 1)
                  }
                  onTimeframeChange={setChartTimeframe}
                  resetSignal={chartResetSignal}
                />
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
                activePositions.length > 0 && marketAddress ? (
                  <div className="grid gap-4">
                    {paginatedActivePositions.map((position) => (
                      <ActivePositionCard
                        key={position.address}
                        baseDecimals={baseDecimals}
                        baseTicker={baseTicker}
                        isCloseDisabled={closePosition.isClosing}
                        isClosing={closePosition.isClosingPosition(
                          position.address,
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
                  baseDecimals={baseDecimals}
                  baseTicker={baseTicker}
                  marketId={MARKET_ID}
                  positionAuthority={address}
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

function PriceChartPanel({
  chartCandles,
  chartHeight = 420,
  chartTimeframe,
  className,
  hasMoreHistory,
  isLoadingMoreHistory,
  isMarketUpdatesLoading,
  marketAddressError,
  marketChartHistoryError,
  marketUpdatesError,
  onCrosshairMove,
  onNeedOlderHistory,
  onReset,
  onTimeframeChange,
  resetSignal,
  statusMinHeightClassName = 'min-h-[420px]',
}: {
  chartCandles: Array<TradingViewAggregatedCandle>
  chartHeight?: number
  chartTimeframe: ChartTimeframe
  className?: string
  hasMoreHistory: boolean
  isLoadingMoreHistory: boolean
  isMarketUpdatesLoading: boolean
  marketAddressError: string | null
  marketChartHistoryError: string | null
  marketUpdatesError: string | null
  onCrosshairMove: (value: ChartCrosshairData | null) => void
  onNeedOlderHistory: (request: ChartHistoryRequest) => void
  onReset: () => void
  onTimeframeChange: (timeframe: ChartTimeframe) => void
  resetSignal: number
  statusMinHeightClassName?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            hasMoreHistory={hasMoreHistory}
            height={chartHeight}
            isLoadingMoreHistory={isLoadingMoreHistory}
            onCrosshairMove={onCrosshairMove}
            onNeedOlderHistory={onNeedOlderHistory}
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
      {marketAddressError ? (
        <p className="text-sm text-destructive">{marketAddressError}</p>
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
