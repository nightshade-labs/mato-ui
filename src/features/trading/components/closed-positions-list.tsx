import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { fetchClosedPositionMiniChart } from '../api/market-repository'
import { useClosedPositionEvents } from '../hooks/use-closed-position-events'
import {
  CLOSED_POSITION_INITIAL_VISIBLE_ROW_COUNT,
  CLOSED_POSITION_MAX_CONCURRENT_CHART_LOADS,
  CLOSED_POSITION_VISIBLE_ROW_OVERSCAN_PX,
} from '../constants'
import type { MiniPriceChartPoint } from '../lib/mini-chart'
import {
  formatAtoms,
  formatExplorerTransactionUrl,
  formatPrice,
  shortenAddress,
} from '../lib/format'
import { buildClosedPositionSummary } from '../view-models/closed-position'
import { MiniPriceChart } from './mini-price-chart'
import type { ClosePositionEvent } from '@/integrations/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { endpoint } from '@/integrations/solana'

interface ClosedPositionChartState {
  error: string | null
  points: Array<MiniPriceChartPoint> | null
  status: 'loading' | 'ready' | 'unavailable' | 'error'
}

const EMPTY_CLOSED_POSITION_EVENTS: Array<ClosePositionEvent> = []

function hasValidChartRange(event: {
  start_slot: number | null
  end_slot: number | null
}): event is { start_slot: number; end_slot: number } {
  return (
    event.start_slot !== null &&
    event.end_slot !== null &&
    event.start_slot <= event.end_slot
  )
}

function areSetsEqual(left: Set<number>, right: Set<number>) {
  if (left === right) {
    return true
  }
  if (left.size !== right.size) {
    return false
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false
    }
  }

  return true
}

function buildChartStateFromMiniChartPoints(
  points: Array<MiniPriceChartPoint>,
): ClosedPositionChartState {
  if (points.length >= 2) {
    return {
      error: null,
      points,
      status: 'ready',
    }
  }

  return {
    error: null,
    points: null,
    status: 'unavailable',
  }
}

export function ClosedPositionsList({
  baseDecimals,
  baseTicker,
  marketId,
  positionAuthority,
  quoteDecimals,
  quoteTicker,
}: {
  baseDecimals: number
  baseTicker: string
  marketId: number
  positionAuthority: string
  quoteDecimals: number
  quoteTicker: string
}) {
  const eventsQuery = useClosedPositionEvents({
    limit: 50,
    marketId,
    positionAuthority,
  })
  const events = useMemo(
    () => eventsQuery.data ?? EMPTY_CLOSED_POSITION_EVENTS,
    [eventsQuery.data],
  )
  const [chartStatesByEventId, setChartStatesByEventId] = useState<
    Map<number, ClosedPositionChartState>
  >(new Map())
  const chartLoadRunRef = useRef(0)
  const rowElementByIdRef = useRef(new Map<number, HTMLDivElement>())
  const [visibleEventIds, setVisibleEventIds] = useState<Set<number>>(new Set())
  const eventIdsKey = useMemo(
    () => events.map((event) => event.id).join('|'),
    [events],
  )

  useEffect(() => {
    const nextVisibleIds = new Set(
      events
        .slice(0, CLOSED_POSITION_INITIAL_VISIBLE_ROW_COUNT)
        .map((event) => event.id),
    )

    setVisibleEventIds((current) =>
      areSetsEqual(current, nextVisibleIds) ? current : nextVisibleIds,
    )
  }, [events])

  useEffect(() => {
    chartLoadRunRef.current += 1
    setChartStatesByEventId((current) => {
      const next = new Map<number, ClosedPositionChartState>()

      for (const event of events) {
        const previous = current.get(event.id)
        if (previous) {
          next.set(event.id, previous)
        }
      }

      return next
    })
  }, [eventIdsKey, events])

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
            }
          }

          return changed ? next : current
        })
      },
      {
        root: null,
        rootMargin: `${CLOSED_POSITION_VISIBLE_ROW_OVERSCAN_PX}px 0px`,
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
  }, [eventIdsKey])

  const activeChartLoadCount = useMemo(() => {
    let count = 0
    for (const chartState of chartStatesByEventId.values()) {
      if (chartState.status === 'loading') {
        count += 1
      }
    }
    return count
  }, [chartStatesByEventId])

  const pendingChartEvents = useMemo(() => {
    const remainingSlots =
      CLOSED_POSITION_MAX_CONCURRENT_CHART_LOADS - activeChartLoadCount
    if (remainingSlots <= 0) {
      return []
    }

    const nextEvents: Array<ClosePositionEvent> = []
    for (const event of events) {
      if (!visibleEventIds.has(event.id)) continue
      if (!hasValidChartRange(event)) continue
      if (chartStatesByEventId.has(event.id)) continue

      nextEvents.push(event)
      if (nextEvents.length >= remainingSlots) {
        break
      }
    }

    return nextEvents
  }, [activeChartLoadCount, chartStatesByEventId, events, visibleEventIds])

  const registerRowElement =
    (eventId: number) => (element: HTMLDivElement | null) => {
      if (element) {
        element.dataset.eventId = String(eventId)
        rowElementByIdRef.current.set(eventId, element)
        return
      }

      rowElementByIdRef.current.delete(eventId)
    }

  useEffect(() => {
    if (pendingChartEvents.length === 0) {
      return
    }

    const runVersion = chartLoadRunRef.current
    setChartStatesByEventId((current) => {
      const next = new Map(current)
      for (const event of pendingChartEvents) {
        if (!next.has(event.id)) {
          next.set(event.id, {
            error: null,
            points: null,
            status: 'loading',
          })
        }
      }
      return next
    })

    for (const event of pendingChartEvents) {
      if (!hasValidChartRange(event)) continue

      void fetchClosedPositionMiniChart({
        endSlot: event.end_slot,
        marketId,
        startSlot: event.start_slot,
      })
        .then((points) => {
          if (chartLoadRunRef.current !== runVersion) {
            return
          }

          setChartStatesByEventId((current) => {
            const next = new Map(current)
            next.set(event.id, buildChartStateFromMiniChartPoints(points))
            return next
          })
        })
        .catch((error: unknown) => {
          if (chartLoadRunRef.current !== runVersion) {
            return
          }

          const message =
            error instanceof Error
              ? error.message
              : 'Failed to load closed-position mini chart'
          setChartStatesByEventId((current) => {
            const next = new Map(current)
            next.set(event.id, {
              error: `Price history unavailable: ${message}`,
              points: null,
              status: 'error',
            })
            return next
          })
        })
    }
  }, [marketId, pendingChartEvents])

  const chartStateForEvent = (
    event: ClosePositionEvent,
  ): ClosedPositionChartState => {
    const existing = chartStatesByEventId.get(event.id)
    if (existing) {
      return existing
    }

    if (!hasValidChartRange(event)) {
      return {
        error: null,
        points: null,
        status: 'unavailable',
      }
    }

    if (visibleEventIds.has(event.id)) {
      return {
        error: null,
        points: null,
        status: 'loading',
      }
    }

    return {
      error: null,
      points: null,
      status: 'unavailable',
    }
  }

  return (
    <Card className="border-white/10 bg-black/15">
      <CardHeader>
        <CardTitle>Closed positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {eventsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">
            Loading recent closes...
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No closed positions yet.
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id} ref={registerRowElement(event.id)}>
              <ClosedPositionRow
                baseDecimals={baseDecimals}
                baseTicker={baseTicker}
                chartState={chartStateForEvent(event)}
                event={event}
                quoteDecimals={quoteDecimals}
                quoteTicker={quoteTicker}
              />
            </div>
          ))
        )}

        {eventsQuery.error instanceof Error ? (
          <p className="text-sm text-destructive">
            {eventsQuery.error.message}
          </p>
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
  const hasChart =
    chartState.status === 'ready' && chartPoints && chartPoints.length >= 2
  const showChartSkeleton = chartState.status === 'loading'

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
      <button
        className="w-full text-left"
        onClick={() => setExpanded((previous) => !previous)}
        type="button"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant={summary.isBuy ? 'positive' : 'negative'}>
              {summary.sideLabel}
            </Badge>
            <div>
              <div className="text-sm text-muted-foreground">
                {summary.flowLabel}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">
                  {formatAtoms(summary.consumedAtoms, summary.depositDecimals)}{' '}
                  {summary.depositToken}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">
                  {formatAtoms(summary.receivedAtoms, summary.swappedDecimals)}{' '}
                  {summary.swappedToken}
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
              onClick={(clickEvent) => clickEvent.stopPropagation()}
            >
              {shortenAddress(event.signature, 6, 4)}
              <ArrowUpRight className="size-3" />
            </a>
            <ChevronDown
              className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
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
            label="Effective price"
            value={
              summary.effectivePrice === null
                ? '—'
                : `${formatPrice(summary.effectivePrice)} ${quoteTicker}/${baseTicker}`
            }
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
      <div className="mb-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
