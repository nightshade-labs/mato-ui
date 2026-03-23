import { memo, startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import type { ClosePositionEvent, MarketUpdateEvent } from '@/integrations/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useClosedPositionEvents } from '../hooks/use-closed-position-events'
import { tradingQueries } from '../queries'
import { buildClosedPositionMiniChart, normalizeMarketPricePoints, type MiniPriceChartPoint } from '../lib/mini-chart'
import { formatAtoms, shortenAddress, formatExplorerTransactionUrl } from '../lib/format'
import { buildClosedPositionSummary } from '../view-models/closed-position'
import { MiniPriceChart } from './mini-price-chart'
import { endpoint } from '@/integrations/solana'

interface ClosedPositionChartState {
  error: string | null
  points: MiniPriceChartPoint[] | null
  status: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'
}

const IDLE_CHART_STATE: ClosedPositionChartState = {
  error: null,
  points: null,
  status: 'idle',
}
const MAX_CONCURRENT_CHART_LOADS = 4

function buildChartStateFromHistory(
  marketHistory: MarketUpdateEvent[],
  event: ClosePositionEvent,
  baseDecimals: number,
  quoteDecimals: number,
): ClosedPositionChartState {
  const normalizedHistory = normalizeMarketPricePoints(marketHistory, baseDecimals, quoteDecimals)
  const points = buildClosedPositionMiniChart(normalizedHistory, event.start_slot, event.end_slot)

  if (points && points.length >= 2) {
    return { error: null, points, status: 'ready' }
  }

  return { error: null, points: null, status: 'unavailable' }
}

function hasValidChartRange(event: ClosePositionEvent) {
  return event.start_slot !== null && event.end_slot !== null && event.start_slot <= event.end_slot
}

function findNextPendingChartEvents(
  events: ClosePositionEvent[],
  chartStatesByEventId: ReadonlyMap<number, ClosedPositionChartState>,
  maxCount: number,
) {
  const pendingEvents: ClosePositionEvent[] = []

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    if (!hasValidChartRange(event)) continue
    if (chartStatesByEventId.has(event.id)) continue
    pendingEvents.push(event)
    if (pendingEvents.length >= maxCount) break
  }

  return pendingEvents
}

export function ClosedPositionsList({
  baseDecimals,
  baseTicker,
  marketHistorySeed = [],
  marketId,
  positionAuthority,
  quoteDecimals,
  quoteTicker,
}: {
  baseDecimals: number
  baseTicker: string
  marketHistorySeed?: MarketUpdateEvent[]
  marketId: number
  positionAuthority: string
  quoteDecimals: number
  quoteTicker: string
}) {
  const queryClient = useQueryClient()
  const eventsQuery = useClosedPositionEvents({ limit: 50, marketId, positionAuthority })
  const events = eventsQuery.data ?? []
  const [chartStatesByEventId, setChartStatesByEventId] = useState<Map<number, ClosedPositionChartState>>(
    new Map(),
  )
  const chartLoadRunRef = useRef(0)
  const isMountedRef = useRef(true)
  const normalizedSeedHistory = useMemo(
    () => normalizeMarketPricePoints(marketHistorySeed, baseDecimals, quoteDecimals),
    [baseDecimals, marketHistorySeed, quoteDecimals],
  )

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    chartLoadRunRef.current += 1
    const cachedChartStates = new Map<number, ClosedPositionChartState>()

    for (const event of events) {
      if (!hasValidChartRange(event)) continue

      const cachedHistory = queryClient.getQueryData<MarketUpdateEvent[]>(
        tradingQueries.marketUpdateRange({
          endSlot: event.end_slot,
          marketId,
          startSlot: event.start_slot,
        }).queryKey,
      )
      if (!cachedHistory) continue

      cachedChartStates.set(event.id, buildChartStateFromHistory(cachedHistory, event, baseDecimals, quoteDecimals))
    }

    setChartStatesByEventId(cachedChartStates)
  }, [baseDecimals, events, marketId, queryClient, quoteDecimals])

  useEffect(() => {
    if (normalizedSeedHistory.length === 0) return

    startTransition(() => {
      setChartStatesByEventId((current) => {
        let next: Map<number, ClosedPositionChartState> | null = null

        for (const event of events) {
          if (!hasValidChartRange(event)) continue
          if (current.get(event.id)?.status === 'ready') continue

          const chart = buildClosedPositionMiniChart(normalizedSeedHistory, event.start_slot, event.end_slot)
          if (chart === null) continue

          if (next === null) {
            next = new Map(current)
          }
          next.set(event.id, { error: null, points: chart, status: 'ready' })
        }

        return next ?? current
      })
    })
  }, [events, normalizedSeedHistory])

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
    const remainingSlots = MAX_CONCURRENT_CHART_LOADS - activeChartLoadCount
    if (remainingSlots <= 0) return []
    return findNextPendingChartEvents(events, chartStatesByEventId, remainingSlots)
  }, [activeChartLoadCount, chartStatesByEventId, events])

  useEffect(() => {
    if (pendingChartEvents.length === 0) return

    const runVersion = chartLoadRunRef.current
    setChartStatesByEventId((current) => {
      const next = new Map(current)
      for (const event of pendingChartEvents) {
        if (!next.has(event.id)) {
          next.set(event.id, { error: null, points: null, status: 'loading' })
        }
      }
      return next
    })

    for (const event of pendingChartEvents) {
      if (event.start_slot === null || event.end_slot === null) continue

      const startSlot = event.start_slot
      const endSlot = event.end_slot
      queryClient
        .fetchQuery(
          tradingQueries.marketUpdateRange({
            endSlot,
            marketId,
            startSlot,
          }),
        )
        .then((marketHistory) => {
          if (!isMountedRef.current || runVersion !== chartLoadRunRef.current) return

          startTransition(() => {
            setChartStatesByEventId((current) => {
              const next = new Map(current)
              next.set(event.id, buildChartStateFromHistory(marketHistory, event, baseDecimals, quoteDecimals))
              return next
            })
          })
        })
        .catch((error) => {
          if (!isMountedRef.current || runVersion !== chartLoadRunRef.current) return
          const message = error instanceof Error ? error.message : 'Unknown error'
          startTransition(() => {
            setChartStatesByEventId((current) => {
              const next = new Map(current)
              next.set(event.id, { error: message, points: null, status: 'error' })
              return next
            })
          })
        })
    }
  }, [baseDecimals, marketId, pendingChartEvents, queryClient, quoteDecimals])

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
            <ClosedPositionRow
              key={event.id}
              baseDecimals={baseDecimals}
              baseTicker={baseTicker}
              chartState={chartStatesByEventId.get(event.id) ?? IDLE_CHART_STATE}
              event={event}
              quoteDecimals={quoteDecimals}
              quoteTicker={quoteTicker}
            />
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

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
      <div className="mb-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
