import { useMemo, useState } from 'react'
import { useWalletConnection, useWalletSession } from '@solana/react-hooks'
import { ArrowUpRight, RefreshCcw } from 'lucide-react'
import {
  CHART_TIMEFRAMES,
  DEFAULT_MARKET_UPDATES_LIMIT,
  MARKET_ID,
} from '../constants'
import {
  atomsFromPercent,
  durationToSlots,
  formatAtomsToInput,
  parseTokenAmount,
  sanitizeAmountInput,
  toSliderPercent,
} from '../lib/amounts'
import { formatExplorerTransactionUrl, formatSignedNumber } from '../lib/format'
import { useMarketAddress } from '../hooks/use-market-address'
import { useMarketChartHistory } from '../hooks/use-market-chart-history'
import { useMarketConfig } from '../hooks/use-market-config'
import { useMarketPrice } from '../hooks/use-market-price'
import { useMarketUpdates } from '../hooks/use-market-updates'
import { useStreamingMarketState } from '../hooks/use-streaming-market-state'
import { useTradePositions } from '../hooks/use-trade-positions'
import { useWalletTokenBalance } from '../hooks/use-wallet-token-balance'
import { useSubmitOrder } from '../hooks/use-submit-order'
import { useClosePosition } from '../hooks/use-close-position'
import {
  buildTradingDashboardViewModel,
  deriveMarketIdentity,
  formatDashboardPrice,
} from '../view-models/trading-dashboard'
import { MarketPriceChart } from './market-price-chart'
import { OrderEntryCard } from './order-entry-card'
import { ActivePositionCard } from './active-position-card'
import { ClosedPositionsList } from './closed-positions-list'
import type {
  ChartCrosshairData,
  ChartHistoryRequest,
} from './market-price-chart'
import type {
  ChartTimeframe,
  MarketPanelTab,
  OrderSide,
  PositionPanelTab,
} from '../constants'
import type { TradePositionRecord } from '../domain/models'
import { endpoint } from '@/integrations/solana'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'

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
  const [marketPanelTab, setMarketPanelTab] = useState<MarketPanelTab>('chart')
  const [positionPanelTab, setPositionPanelTab] =
    useState<PositionPanelTab>('active')
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1m')
  const [chartResetSignal, setChartResetSignal] = useState(0)
  const [crosshairData, setCrosshairData] = useState<ChartCrosshairData | null>(
    null,
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const submitOrder = useSubmitOrder()
  const closePosition = useClosePosition()

  const {
    baseDecimals,
    baseMint,
    baseTicker,
    quoteDecimals,
    quoteMint,
    quoteTicker,
  } = useMemo(() => deriveMarketIdentity(marketConfig), [marketConfig])
  const marketChartHistory = useMarketChartHistory({
    marketId: MARKET_ID,
    timeframe: chartTimeframe,
  })

  const baseBalance = useWalletTokenBalance(baseMint, baseDecimals || 9)
  const quoteBalance = useWalletTokenBalance(quoteMint, quoteDecimals || 9)

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

  const amountUiValue = useMemo(() => {
    if (!amountAtoms || amountAtoms <= 0n) return null
    return Number(amountAtoms) / 10 ** amountDecimals
  }, [amountAtoms, amountDecimals])

  const activePositions = useMemo<Array<TradePositionRecord>>(
    () => tradePositionsQuery.data ?? [],
    [tradePositionsQuery.data],
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
    priceDelta,
    priceDeltaPercent,
    priceImpactDisplay,
  } = dashboardViewModel

  const submitDisabled =
    !walletConnection.connected ||
    !marketAddress ||
    !amountAtoms ||
    amountAtoms <= 0n ||
    amountExceedsAvailable ||
    submitOrder.isSubmitting

  const submitStatusLabel =
    submitOrder.status === 'building'
      ? 'Building order...'
      : submitOrder.status === 'wrapping'
        ? 'Wrapping SOL...'
        : submitOrder.status === 'submitting'
          ? 'Submitting order...'
          : side === 'buy'
            ? 'Submit buy order'
            : 'Submit sell order'

  const refreshBalances = async () => {
    await Promise.allSettled([baseBalance.refresh(), quoteBalance.refresh()])
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
    setValidationError(null)
  }

  const handleSubmit = async () => {
    if (!marketAddress) {
      setValidationError('Market address is still loading.')
      return
    }
    if (!amountAtoms || amountAtoms <= 0n) {
      setValidationError(`Enter a valid ${amountTokenTicker} amount.`)
      return
    }
    if (amountAtoms > availableAtoms) {
      setValidationError(
        `Amount exceeds available ${amountTokenTicker} balance.`,
      )
      return
    }

    setValidationError(null)
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

  const topAlert = validationError ?? submitOrder.error ?? closePosition.error
  const topAlertVariant =
    submitOrder.status === 'success' || closePosition.status === 'success'
      ? 'success'
      : topAlert
        ? 'error'
        : null
  const txSignature = submitOrder.signature ?? closePosition.signature

  return (
    <div className="relative min-h-screen bg-[color:var(--color-page-bg)] text-foreground">
      <div className="relative mx-auto max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.04em]">
            {baseTicker}/{quoteTicker}
          </h1>
          <span className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-accent-strong)]">
            {formatDashboardPrice(displayPrice)}
          </span>
          {priceDelta !== null && priceDeltaPercent !== null ? (
            <Badge variant={priceDelta >= 0 ? 'positive' : 'negative'}>
              {formatSignedNumber(priceDeltaPercent, 2)}%
            </Badge>
          ) : null}
        </div>

        {topAlert ? (
          <Alert
            className={`mb-6 ${
              topAlertVariant === 'success'
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{topAlert}</span>
              {txSignature ? (
                <a
                  className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                  href={formatExplorerTransactionUrl(txSignature, endpoint)}
                  rel="noreferrer"
                  target="_blank"
                >
                  View transaction
                  <ArrowUpRight className="size-4" />
                </a>
              ) : null}
            </div>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.95fr)]">
          <div className="space-y-6">
            <Card className="border-white/10 bg-black/15">
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {(['chart', 'trades', 'order-book'] as const).map((tab) => (
                      <Button
                        key={tab}
                        className="rounded-full"
                        onClick={() => setMarketPanelTab(tab)}
                        size="xs"
                        variant={marketPanelTab === tab ? 'default' : 'outline'}
                      >
                        {tab === 'order-book' ? 'Order book' : tab}
                      </Button>
                    ))}
                  </div>
                  <Button
                    className="rounded-full"
                    onClick={() =>
                      setChartResetSignal((previous) => previous + 1)
                    }
                    size="xs"
                    variant="outline"
                  >
                    <RefreshCcw className="size-3.5" />
                    Reset
                  </Button>
                </div>

                {marketPanelTab === 'chart' ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {CHART_TIMEFRAMES.map((timeframe) => (
                          <Button
                            key={timeframe.label}
                            className="rounded-full"
                            onClick={() => setChartTimeframe(timeframe.label)}
                            size="xs"
                            variant={
                              chartTimeframe === timeframe.label
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {timeframe.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {marketUpdates.isLoading && chartCandles.length === 0 ? (
                      <div className="flex min-h-[420px] items-center justify-center rounded-[1.5rem] border border-white/8 bg-white/5 text-sm text-muted-foreground">
                        Loading market history...
                      </div>
                    ) : chartCandles.length === 0 ? (
                      <div className="flex min-h-[420px] items-center justify-center rounded-[1.5rem] border border-white/8 bg-white/5 text-sm text-muted-foreground">
                        Not enough market updates to render the chart yet.
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[1.5rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),rgba(255,255,255,0)_55%)]">
                        <MarketPriceChart
                          defaultVisibleBars={
                            DEFAULT_VISIBLE_BARS_BY_TIMEFRAME[chartTimeframe]
                          }
                          data={chartCandles}
                          hasMoreHistory={marketChartHistory.hasMoreHistory}
                          isLoadingMoreHistory={
                            marketChartHistory.isLoadingMoreHistory
                          }
                          onCrosshairMove={setCrosshairData}
                          onNeedOlderHistory={handleNeedOlderChartHistory}
                          resetSignal={chartResetSignal}
                          viewportPresetKey={chartTimeframe}
                        />
                      </div>
                    )}
                  </>
                ) : marketPanelTab === 'trades' ? (
                  address ? (
                    <ClosedPositionsList
                      baseDecimals={baseDecimals}
                      baseTicker={baseTicker}
                      marketId={MARKET_ID}
                      positionAuthority={address}
                      quoteDecimals={quoteDecimals}
                      quoteTicker={quoteTicker}
                    />
                  ) : (
                    <EmptyState copy="Connect a wallet to inspect your recent fills and close events." />
                  )
                ) : (
                  <EmptyState copy="Order book snapshots are not in the available feed yet, so the web app mirrors the mobile placeholder here." />
                )}

                {marketUpdates.error ? (
                  <p className="text-sm text-destructive">
                    {marketUpdates.error}
                  </p>
                ) : null}
                {marketChartHistory.error ? (
                  <p className="text-sm text-destructive">
                    {marketChartHistory.error}
                  </p>
                ) : null}
                {marketAddressQuery.error instanceof Error ? (
                  <p className="text-sm text-destructive">
                    {marketAddressQuery.error.message}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['active', 'closed'] as const).map((tab) => (
                  <Button
                    key={tab}
                    className="rounded-full"
                    onClick={() => setPositionPanelTab(tab)}
                    size="xs"
                    variant={positionPanelTab === tab ? 'default' : 'outline'}
                  >
                    {tab === 'active' ? 'Active positions' : 'Closed positions'}
                  </Button>
                ))}
              </div>

              {positionPanelTab === 'active' ? (
                activePositions.length > 0 && marketAddress ? (
                  <div className="grid gap-4">
                    {activePositions.map((position) => (
                      <ActivePositionCard
                        key={position.address}
                        baseDecimals={baseDecimals}
                        baseTicker={baseTicker}
                        isClosing={closePosition.isClosing}
                        marketAddress={marketAddress}
                        onClose={async (tradePositionAddress) => {
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
                  </div>
                ) : (
                  <EmptyState copy="Your active TWOB positions will appear here once an order is live." />
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

          <div className="space-y-6">
            <OrderEntryCard
              amountInput={amountInput}
              amountTokenTicker={amountTokenTicker}
              availableAmountDisplay={
                Number(availableAtoms) / 10 ** amountDecimals
              }
              canSubmit={!submitDisabled}
              durationSeconds={durationSeconds}
              estimatedConversionText={estimatedConversionText}
              executionPriceDisplay={executionPriceDisplay}
              isConnected={walletConnection.connected}
              onAmountChange={(value) => {
                setAmountInput(sanitizeAmountInput(value))
                setValidationError(null)
              }}
              onDurationChange={setDurationSeconds}
              onMaxClick={() => handleSliderChange(100)}
              onPercentSelect={handleSliderChange}
              onSideChange={(nextSide) => {
                setSide(nextSide)
                setAmountInput('')
                setValidationError(null)
              }}
              onSliderChange={handleSliderChange}
              onSubmit={() => void handleSubmit()}
              priceImpactDisplay={priceImpactDisplay}
              selectedPercent={sliderValue}
              side={side}
              statusLabel={submitStatusLabel}
              validationError={validationError}
            />
          </div>
        </div>
      </div>
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
