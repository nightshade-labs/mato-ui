import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ClosePositionEvent, MarketUpdateEvent } from '@/integrations/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useClosedPositionEvents } from '../hooks/use-closed-position-events'
import type { EnsureHistoryOptions } from '../lib/market-history-store'
import {
  buildClosedPositionMiniChart,
  normalizeMarketPricePoints,
  type MiniPriceChartPoint,
} from '../lib/mini-chart'
import { formatAtoms, shortenAddress, formatExplorerTransactionUrl } from '../lib/format'
import {
  hasFullCoverage,
  mergeAdjacentRanges,
  selectPointsForRange,
  type SlotRange,
} from '../lib/slot-ranges'
import { buildClosedPositionSummary } from '../view-models/closed-position'
import { MiniPriceChart } from './mini-price-chart'
import { endpoint } from '@/integrations/solana'
import { ArrowUpRight, ChevronDown } from 'lucide-react'

interface ClosedPositionChartState {
  error: string | null
  points: MiniPriceChartPoint[] | null
  status: 'loading' | 'ready' | 'unavailable' | 'error'
}

const MAX_CONCURRENT_CHART_LOADS = 12
const MINI_CHART_BATCH_GAP_SLOTS = 600
const INITIAL_VISIBLE_ROW_COUNT = 8
const VISIBLE_ROW_OVERSCAN_PX = 320

function hasValidChartRange(
  event: { start_slot: number | null; end_slot: number | null },
): event is { start_slot: number; end_slot: number } {
  return event.start_slot !== null && event.end_slot !== null && event.start_slot <= event.end_slot
}

function toChartRange(event: { start_slot: number; end_slot: number }): SlotRange {
  return {
    endSlot: event.end_slot,
    startSlot: event.start_slot,
  }
}

function buildChartStateFromSharedHistory({
  event,
  failedRanges,
  loadedRanges,
  normalizedHistory,
}: {
  event: { end_slot: number | null; start_slot: number | null }
  failedRanges: SlotRange[]
  loadedRanges: SlotRange[]
  normalizedHistory: ReturnType<typeof normalizeMarketPricePoints>
}): ClosedPositionChartState {
  if (!hasValidChartRange(event)) {
    return { error: null, points: null, status: 'unavailable' }
  }

  const chartRange = toChartRange({
    end_slot: event.end_slot,
    start_slot: event.start_slot,
  })

  if (hasFullCoverage(loadedRanges, chartRange)) {
    const points = buildClosedPositionMiniChart(
      selectPointsForRange(normalizedHistory, chartRange),
      chartRange.startSlot,
      chartRange.endSlot,
    )

    if (points && points.length >= 2) {
      return { error: null, points, status: 'ready' }
    }

    return { error: null, points: null, status: 'unavailable' }
  }

  if (hasFullCoverage(failedRanges, chartRange)) {
    return { error: 'Price history unavailable.', points: null, status: 'error' }
  }

  return { error: null, points: null, status: 'loading' }
}

export function ClosedPositionsList({
  baseDecimals,
  baseTicker,
  ensureMarketHistoryRanges,
  marketHistoryFailedRanges = [],
  marketHistoryLoadedRanges = [],
  marketHistoryPendingRanges = [],
  marketHistorySeed = [],
  marketId,
  positionAuthority,
  quoteDecimals,
  quoteTicker,
}: {
  baseDecimals: number
  baseTicker: string
  ensureMarketHistoryRanges?: (
    ranges: SlotRange[],
    options?: EnsureHistoryOptions,
  ) => Promise<void>
  marketHistoryFailedRanges?: SlotRange[]
  marketHistoryLoadedRanges?: SlotRange[]
  marketHistoryPendingRanges?: SlotRange[]
  marketHistorySeed?: MarketUpdateEvent[]
  marketId: number
  positionAuthority: string
  quoteDecimals: number
  quoteTicker: string
}) {
  const eventsQuery = useClosedPositionEvents({ limit: 50, marketId, positionAuthority })
  const events = eventsQuery.data ?? []
  const normalizedSeedHistory = useMemo(
    () => normalizeMarketPricePoints(marketHistorySeed, baseDecimals, quoteDecimals),
    [baseDecimals, marketHistorySeed, quoteDecimals],
  )
  const requestedRanges = useMemo(
    () =>
      mergeAdjacentRanges(
        [...marketHistoryLoadedRanges, ...marketHistoryPendingRanges, ...marketHistoryFailedRanges],
        0,
      ),
    [marketHistoryFailedRanges, marketHistoryLoadedRanges, marketHistoryPendingRanges],
  )
  const pendingEnsureKeyRef = useRef<string | null>(null)
  const rowElementByIdRef = useRef(new Map<number, HTMLDivElement>())
  const [visibleEventIds, setVisibleEventIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    setVisibleEventIds(new Set(events.slice(0, INITIAL_VISIBLE_ROW_COUNT).map((event) => event.id)))
  }, [events])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleEventIds((current) => {
          const next = new Set(current)
          let changed = false

          for (const entry of entries) {
            const id = Number((entry.target as HTMLElement).dataset.eventId)
            if (!Number.isFinite(id)) continue

            if (entry.isIntersecting) {
              if (!next.has(id)) {
                next.add(id)
                changed = true
              }
              continue
            }

            if (next.delete(id)) {
              changed = true
            }
          }

          return changed ? next : current
        })
      },
      {
        root: null,
        rootMargin: `${VISIBLE_ROW_OVERSCAN_PX}px 0px`,
        threshold: 0,
      },
    )

    for (const [eventId, element] of rowElementByIdRef.current.entries()) {
      element.dataset.eventId = String(eventId)
      observer.observe(element)
    }

    return () => {
      observer.disconnect()
    }
  }, [events])

  const unresolvedRanges = useMemo(() => {
    const nextRanges: SlotRange[] = []

    for (const event of events) {
      if (!visibleEventIds.has(event.id)) continue
      if (!hasValidChartRange(event)) continue

      const chartRange = toChartRange({
        end_slot: event.end_slot,
        start_slot: event.start_slot,
      })

      if (hasFullCoverage(requestedRanges, chartRange)) {
        continue
      }

      nextRanges.push(chartRange)
      if (nextRanges.length >= MAX_CONCURRENT_CHART_LOADS) {
        break
      }
    }

    return nextRanges
  }, [events, requestedRanges, visibleEventIds])

  const registerRowElement = (eventId: number) => (element: HTMLDivElement | null) => {
    if (element) {
      element.dataset.eventId = String(eventId)
      rowElementByIdRef.current.set(eventId, element)
      return
    }

    rowElementByIdRef.current.delete(eventId)
  }

  useEffect(() => {
    if (!ensureMarketHistoryRanges || unresolvedRanges.length === 0) {
      pendingEnsureKeyRef.current = null
      return
    }

    const requestKey = unresolvedRanges
      .map((range) => `${range.startSlot}:${range.endSlot}`)
      .join('|')
    if (pendingEnsureKeyRef.current === requestKey) {
      return
    }

    pendingEnsureKeyRef.current = requestKey
    void ensureMarketHistoryRanges(unresolvedRanges, {
      maxGapSlots: MINI_CHART_BATCH_GAP_SLOTS,
      reason: 'mini-chart',
    }).finally(() => {
      if (pendingEnsureKeyRef.current === requestKey) {
        pendingEnsureKeyRef.current = null
      }
    })
  }, [ensureMarketHistoryRanges, unresolvedRanges])

  const chartStatesByEventId = useMemo(() => {
    const next = new Map<number, ClosedPositionChartState>()

    for (const event of events) {
      next.set(
        event.id,
        buildChartStateFromSharedHistory({
          event,
          failedRanges: marketHistoryFailedRanges,
          loadedRanges: marketHistoryLoadedRanges,
          normalizedHistory: normalizedSeedHistory,
        }),
      )
    }

    return next
  }, [events, marketHistoryFailedRanges, marketHistoryLoadedRanges, normalizedSeedHistory])

  return (
    <Card className="border-white/10 bg-black/15">
      <CardHeader>
        <CardTitle>Closed positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {eventsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading recent closes...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No closed positions yet.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} ref={registerRowElement(event.id)}>
              <ClosedPositionRow
                baseDecimals={baseDecimals}
                baseTicker={baseTicker}
                chartState={chartStatesByEventId.get(event.id) ?? { error: null, points: null, status: 'loading' }}
                event={event}
                quoteDecimals={quoteDecimals}
                quoteTicker={quoteTicker}
              />
            </div>
          ))
        )}

        {eventsQuery.error instanceof Error ? (
          <p className="text-sm text-destructive">{eventsQuery.error.message}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

const ClosedPositionRow = memo(function ClosedPositionRow({
  baseDecimals,
  baseTicker,
  chartState,
  event,
  quoteDecimals,
  quoteTicker,
}: {
  baseDecimals: number
  baseTicker: string
  chartState: ClosedPositionChartState
  event: ClosePositionEvent
  quoteDecimals: number
  quoteTicker: string
}) {
  const [expanded, setExpanded] = useState(false)
  const summary = useMemo(
    () =>
      buildClosedPositionSummary({
        baseDecimals,
        baseTicker,
        event,
        quoteDecimals,
        quoteTicker,
      }),
    [baseDecimals, baseTicker, event, quoteDecimals, quoteTicker],
  )
  const chartPoints = chartState.points
  const hasChart = chartState.status === 'ready' && chartPoints && chartPoints.length >= 2
  const showChartSkeleton = chartState.status === 'loading'

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
      <button className="w-full text-left" onClick={() => setExpanded((previous) => !previous)} type="button">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant={summary.isBuy ? 'positive' : 'negative'}>{summary.sideLabel}</Badge>
            <div>
              <div className="text-sm text-muted-foreground">{summary.flowLabel}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">
                  {formatAtoms(summary.consumedAtoms, summary.depositDecimals)} {summary.depositToken}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">
                  {formatAtoms(summary.receivedAtoms, summary.swappedDecimals)} {summary.swappedToken}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <a
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
              href={formatExplorerTransactionUrl(event.signature, endpoint)}
              rel="noreferrer"
              target="_blank"
              onClick={(event) => event.stopPropagation()}
            >
              {shortenAddress(event.signature, 6, 4)}
              <ArrowUpRight className="size-3" />
            </a>
            <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {hasChart ? (
        <div className="mt-4">
          <MiniPriceChart
            averageClassName="stroke-emerald-300/70"
            averagePrice={summary.averageFillPrice}
            lineClassName="stroke-[color:var(--color-accent-strong)]"
            points={chartPoints}
          />
        </div>
      ) : showChartSkeleton ? (
        <MiniChartSkeleton />
      ) : null}

      {expanded ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailCard
            label="Deposited"
            value={`${formatAtoms(event.deposit_amount, summary.depositDecimals)} ${summary.depositToken}`}
          />
          <DetailCard
            label={summary.isBuy ? 'Actually spent' : 'Actually sold'}
            value={`${formatAtoms(summary.consumedAtoms, summary.depositDecimals)} ${summary.depositToken}`}
          />
          <DetailCard
            label="Received"
            value={`${formatAtoms(summary.receivedAtoms, summary.swappedDecimals)} ${summary.swappedToken}`}
          />
          <DetailCard
            label="Fee"
            value={`${formatAtoms(summary.feeAtoms, summary.swappedDecimals)} ${summary.swappedToken}`}
          />
        </div>
      ) : null}

      {chartState.status === 'error' && chartState.error ? (
        <p className="mt-3 text-sm text-destructive">{chartState.error}</p>
      ) : null}
    </div>
  )
})

function MiniChartSkeleton() {
  return (
    <div className="mt-4 rounded-xl border border-border/50 bg-background/50 p-2">
      <div className="mb-2 flex gap-3">
        <div className="h-2 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="h-2 w-20 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="flex items-stretch gap-3">
        <div className="flex h-[60px] w-14 shrink-0 flex-col justify-between">
          <div className="h-2 w-12 animate-pulse rounded-full bg-white/10" />
          <div className="h-2 w-10 animate-pulse rounded-full bg-white/10" />
          <div className="h-2 w-12 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="h-[60px] flex-1 animate-pulse rounded-lg bg-white/5" />
      </div>
    </div>
  )
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
      <div className="mb-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
