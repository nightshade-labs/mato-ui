import { useMemo, useState } from 'react'
import { useWalletConnection, useWalletSession } from '@solana/react-hooks'
import { ArrowUpRight, CandlestickChart, RadioTower, RefreshCcw, Wallet } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CHART_TIMEFRAMES,
  DEFAULT_MARKET_UPDATES_LIMIT,
  MARKET_ID,
  type ChartTimeframe,
  type MarketPanelTab,
  type OrderSide,
  type PositionPanelTab,
} from '../constants'
import { sanitizeAmountInput, parseTokenAmount, atomsFromPercent, durationToSlots, formatAtomsToInput, toSliderPercent } from '../lib/amounts'
import { formatCompactNumber, formatExplorerTransactionUrl, formatPrice, formatSignedNumber, formatUiAmount, shortenAddress } from '../lib/format'
import type { TradePositionRecord } from '../domain/models'
import { useMarketAddress } from '../hooks/use-market-address'
import { useMarketConfig } from '../hooks/use-market-config'
import { useMarketPrice } from '../hooks/use-market-price'
import { useMarketUpdates } from '../hooks/use-market-updates'
import { useStreamingMarketState } from '../hooks/use-streaming-market-state'
import { useTradePositions } from '../hooks/use-trade-positions'
import { useWalletTokenBalance } from '../hooks/use-wallet-token-balance'
import { useSubmitOrder } from '../hooks/use-submit-order'
import { useClosePosition } from '../hooks/use-close-position'
import { MarketPriceChart, type ChartCrosshairData } from './market-price-chart'
import { WalletConnectionButton } from './wallet-connection-button'
import { OrderEntryCard } from './order-entry-card'
import { ActivePositionCard } from './active-position-card'
import { ClosedPositionsList } from './closed-positions-list'
import { endpoint } from '@/integrations/solana'
import {
  buildTradingDashboardViewModel,
  deriveMarketIdentity,
  formatDashboardPrice,
} from '../view-models/trading-dashboard'

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
  const [positionPanelTab, setPositionPanelTab] = useState<PositionPanelTab>('active')
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1h')
  const [chartResetSignal, setChartResetSignal] = useState(0)
  const [crosshairData, setCrosshairData] = useState<ChartCrosshairData | null>(null)
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

  const baseBalance = useWalletTokenBalance(baseMint, baseDecimals || 9)
  const quoteBalance = useWalletTokenBalance(quoteMint, quoteDecimals || 9)

  const selectedBalance = side === 'sell' ? baseBalance : quoteBalance
  const amountTokenTicker = side === 'sell' ? baseTicker : quoteTicker
  const amountDecimals = side === 'sell' ? baseDecimals : quoteDecimals
  const availableAtoms = selectedBalance.spendableAtoms
  const amountAtoms = useMemo(() => parseTokenAmount(amountInput, amountDecimals), [amountDecimals, amountInput])
  const sliderValue = useMemo(() => toSliderPercent(amountAtoms, availableAtoms), [amountAtoms, availableAtoms])
  const amountExceedsAvailable = amountAtoms !== null && amountAtoms > availableAtoms

  const amountUiValue = useMemo(() => {
    if (!amountAtoms || amountAtoms <= 0n) return null
    return Number(amountAtoms) / 10 ** amountDecimals
  }, [amountAtoms, amountDecimals])

  const activePositions = useMemo<TradePositionRecord[]>(
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
        chartTimeframe,
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
      chartTimeframe,
      crosshairData,
      durationSeconds,
      marketPriceQuery.data,
      marketUpdates.events,
      quoteDecimals,
      quoteTicker,
      side,
      streamingStateQuery.data,
    ],
  )
  const {
    activeOhlcv,
    activeOhlcvTimeLabel,
    chartCandles,
    displayPrice,
    estimatedConversionText,
    executionPriceDisplay,
    marketStats,
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
      setValidationError(`Amount exceeds available ${amountTokenTicker} balance.`)
      return
    }

    setValidationError(null)
    const durationSlots = durationToSlots(durationSeconds)
    const success = await submitOrder.submitOrder({
      amount: amountAtoms,
      durationSlots,
      existingWrappedAtoms: selectedBalance.existingWrappedAtoms,
      id: BigInt(Date.now()),
      inputMintAddress: side === 'buy' ? quoteMint ?? '' : baseMint ?? '',
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
    submitOrder.status === 'success' || closePosition.status === 'success' ? 'success' : topAlert ? 'error' : null
  const txSignature = submitOrder.signature ?? closePosition.signature

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--color-page-bg)] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(40,197,173,0.18),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(254,194,96,0.12),transparent_24%),linear-gradient(180deg,rgba(7,17,31,0),rgba(7,17,31,0.85))]" />
      <div className="relative mx-auto max-w-[1440px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <header className="relative z-20 mb-8 rounded-[2rem] border border-white/10 bg-black/20 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <Badge variant="accent">TWOB Web Terminal</Badge>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                  {baseTicker}/{quoteTicker}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  A cleaner desktop port of `mato-mobile`: wallet-standard connection, Codama-generated Twob client,
                  Supabase market history, and direct `lightweight-charts` rendering.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Wallet</div>
                <div className="mt-2 flex items-center gap-3">
                  <Wallet className="size-4 text-[color:var(--color-accent-strong)]" />
                  <span className="font-medium">
                    {address ? shortenAddress(address, 6, 6) : 'Disconnected'}
                  </span>
                </div>
              </div>
              <WalletConnectionButton />
            </div>
          </div>
        </header>

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

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricPanel
            icon={<CandlestickChart className="size-4" />}
            label="Last Price"
            value={formatDashboardPrice(displayPrice)}
            detail={
              priceDelta !== null && priceDeltaPercent !== null
                ? `${formatSignedNumber(priceDeltaPercent, 2)}%`
                : 'Waiting for ticks'
            }
          />
          <MetricPanel label="24h High" value={marketStats.high === null ? '—' : `$${formatPrice(marketStats.high)}`} />
          <MetricPanel label="24h Low" value={marketStats.low === null ? '—' : `$${formatPrice(marketStats.low)}`} />
          <MetricPanel
            icon={<RadioTower className="size-4" />}
            label={`24h Vol (${quoteTicker})`}
            value={formatCompactNumber(marketStats.volumeQuote)}
            detail={streamingStateQuery.data ? 'Live stream active' : 'Polling on-chain state'}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.95fr)]">
          <div className="space-y-6">
            <Card className="border-white/10 bg-black/15">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="muted">Spot</Badge>
                      {priceDelta !== null && priceDeltaPercent !== null ? (
                        <Badge variant={priceDelta >= 0 ? 'positive' : 'negative'}>
                          {formatSignedNumber(priceDeltaPercent, 2)}%
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-4xl font-semibold tracking-[-0.05em]">
                      {formatDashboardPrice(displayPrice)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {activeOhlcvTimeLabel ?? 'Awaiting market history'}
                    </div>
                  </div>

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
                    <Button
                      className="rounded-full"
                      onClick={() => setChartResetSignal((previous) => previous + 1)}
                      size="xs"
                      variant="outline"
                    >
                      <RefreshCcw className="size-3.5" />
                      Reset
                    </Button>
                  </div>
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
                            variant={chartTimeframe === timeframe.label ? 'default' : 'outline'}
                          >
                            {timeframe.label}
                          </Button>
                        ))}
                      </div>
                      {marketUpdates.hasMoreHistory ? (
                        <Button
                          className="rounded-full"
                          onClick={() => void marketUpdates.loadMoreHistory()}
                          size="xs"
                          variant="outline"
                        >
                          {marketUpdates.loadingMoreHistory ? 'Loading history...' : 'Load older candles'}
                        </Button>
                      ) : null}
                    </div>

                    {activeOhlcv ? (
                      <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/5 p-4 sm:grid-cols-5">
                        <MetricChip label="Open" value={formatPrice(activeOhlcv.open)} />
                        <MetricChip label="High" value={formatPrice(activeOhlcv.high)} />
                        <MetricChip label="Low" value={formatPrice(activeOhlcv.low)} />
                        <MetricChip label="Close" value={formatPrice(activeOhlcv.close)} />
                        <MetricChip label="Volume" value={activeOhlcv.volume === null ? '—' : formatCompactNumber(activeOhlcv.volume)} />
                      </div>
                    ) : null}

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
                          data={chartCandles}
                          onCrosshairMove={setCrosshairData}
                          resetSignal={chartResetSignal}
                        />
                      </div>
                    )}
                  </>
                ) : marketPanelTab === 'trades' ? (
                  address ? (
                    <ClosedPositionsList
                      baseDecimals={baseDecimals}
                      baseTicker={baseTicker}
                      marketHistorySeed={marketUpdates.events}
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

                {marketUpdates.error ? <p className="text-sm text-destructive">{marketUpdates.error}</p> : null}
                {marketAddressQuery.error instanceof Error ? (
                  <p className="text-sm text-destructive">{marketAddressQuery.error.message}</p>
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
                          const success = await closePosition.closePosition({ marketAddress, tradePositionAddress })
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
                  marketHistorySeed={marketUpdates.events}
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
              availableAmountDisplay={Number(availableAtoms) / 10 ** amountDecimals}
              canSubmit={!submitDisabled}
              durationSeconds={durationSeconds}
              estimatedConversionText={estimatedConversionText}
              executionPriceDisplay={executionPriceDisplay}
              isConnected={walletConnection.connected}
              nativeBalanceNote={
                selectedBalance.isNative ? `Includes ${formatUiAmount(Number(selectedBalance.existingWrappedAtoms) / 1e9)} wrapped SOL` : null
              }
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

function MetricPanel({
  detail,
  icon,
  label,
  value,
}: {
  detail?: string
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card className="border-white/10 bg-black/20">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-semibold tracking-[-0.04em]">{value}</div>
        {detail ? <div className="text-sm text-muted-foreground">{detail}</div> : null}
      </CardContent>
    </Card>
  )
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <Card className="border-white/10 bg-black/20">
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{copy}</CardContent>
    </Card>
  )
}
