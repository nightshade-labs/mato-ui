import { useMemo } from 'react'
import type { Address } from '@solana/kit'
import { ArrowUpRight, Waves } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { TradePositionRecord } from '../domain/models'
import { formatAtoms, formatPrice } from '../lib/format'
import { getActivePositionMetrics } from '../lib/position-progress'
import { useEndSlotBookkeepingSnapshot } from '../hooks/use-end-slot-bookkeeping-snapshot'
import type { StreamingMarketState } from '../domain/models'

export function ActivePositionCard({
  baseDecimals,
  baseTicker,
  isClosing,
  marketAddress,
  onClose,
  position,
  quoteDecimals,
  quoteTicker,
  streamingState,
}: {
  baseDecimals: number
  baseTicker: string
  isClosing: boolean
  marketAddress: Address
  onClose: (tradePositionAddress: Address) => void
  position: TradePositionRecord
  quoteDecimals: number
  quoteTicker: string
  streamingState: StreamingMarketState | null
}) {
  const snapshotQuery = useEndSlotBookkeepingSnapshot({
    currentSlot: streamingState?.currentSlot ?? null,
    enabled: Boolean(
      streamingState &&
      streamingState.currentSlot > Number(position.data.endSlot),
    ),
    endSlot: Number(position.data.endSlot),
    endSlotInterval: streamingState?.endSlotInterval ?? null,
    isBuy: position.data.isBuy === 1,
    marketAddress,
  })

  const metrics = useMemo(
    () =>
      getActivePositionMetrics({
        baseDecimals,
        baseTicker,
        endSlotBookkeepingSnapshot: snapshotQuery.data ?? null,
        market: marketAddress,
        position: position.data,
        quoteDecimals,
        quoteTicker,
        streamingState,
      }),
    [
      baseDecimals,
      baseTicker,
      marketAddress,
      position.data,
      quoteDecimals,
      quoteTicker,
      snapshotQuery.data,
      streamingState,
    ],
  )

  return (
    <Card className="border-white/10 bg-black/15">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge
              variant={position.data.isBuy === 1 ? 'positive' : 'negative'}
            >
              {metrics.sideLabel}
            </Badge>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Waves className="size-4" />
                <span>{metrics.flowLabel}</span>
              </div>
              <p className="mt-1 text-lg font-semibold">
                {formatAtoms(metrics.amountAtoms, metrics.depositedDecimals)}{' '}
                {metrics.depositedToken}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Remaining
              </p>
              <p className="font-medium">
                {metrics.remainingPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <Progress
          className="h-2.5 bg-white/8"
          indicatorClassName="bg-[linear-gradient(90deg,var(--color-accent-strong),#7be6c1)]"
          value={metrics.progressPercent}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Deposited"
            value={`${formatAtoms(metrics.amountAtoms, metrics.depositedDecimals)} ${metrics.depositedToken}`}
          />
          <MetricCard
            label="Remaining"
            value={`${formatAtoms(metrics.remainingAtoms, metrics.depositedDecimals)} ${metrics.depositedToken}`}
          />
          <MetricCard
            label="Flow"
            value={`${formatAtoms(metrics.flowAtomsPerSlot, metrics.depositedDecimals)} ${metrics.depositedToken}/slot`}
          />
          <MetricCard
            label="Swapped"
            value={
              metrics.swappedAtoms === null
                ? '—'
                : `${formatAtoms(metrics.swappedAtoms, metrics.swappedDecimals)} ${metrics.swappedToken}`
            }
          />
        </div>

        <div className="grid gap-3">
          <MetricCard
            icon={<ArrowUpRight className="size-4" />}
            label="Average Price"
            value={
              metrics.averagePrice === null
                ? '—'
                : `${formatPrice(metrics.averagePrice)} ${quoteTicker}/${baseTicker}`
            }
          />
        </div>
        <Button
          className="w-full rounded-xl bg-rose-500/85 text-white hover:bg-rose-500"
          disabled={isClosing}
          onClick={() => onClose(position.address)}
        >
          {isClosing ? 'Closing position...' : 'Close position'}
        </Button>
      </CardContent>
    </Card>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  )
}
