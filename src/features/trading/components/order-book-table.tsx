import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from 'lucide-react'
import {
  formatAtoms,
  formatExplorerAddressUrl,
  shortenAddress,
} from '../lib/format'
import type { ReactNode } from 'react'
import type { TradePositionRecord } from '../domain/models'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { endpoint } from '@/integrations/solana'
import { cn } from '@/lib/utils'

type OrderBookSortKey = 'direction' | 'endSlot' | 'flow' | 'size' | 'startSlot'

type DirectionFilter = 'all' | 'buy' | 'sell'
type SortDirection = 'asc' | 'desc'

interface OrderBookRow {
  amountAtoms: bigint
  amountDecimals: number
  amountToken: string
  direction: 'Buy' | 'Sell'
  endSlot: bigint
  flowAtomsPerSlot: bigint
  position: TradePositionRecord
  startSlot: bigint
}

const ORDER_BOOK_COLUMNS = [
  { label: 'Direction', sortKey: 'direction' },
  { label: 'Position', sortKey: null },
  { label: 'Size', sortKey: 'size' },
  { label: 'Flow', sortKey: 'flow' },
  { label: 'Start slot', sortKey: 'startSlot' },
  { label: 'End slot', sortKey: 'endSlot' },
] as const satisfies Array<{
  label: string
  sortKey: OrderBookSortKey | null
}>

const DIRECTION_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Buy', value: 'buy' },
  { label: 'Sell', value: 'sell' },
] as const satisfies Array<{ label: string; value: DirectionFilter }>

export function OrderBookTable({
  baseDecimals,
  baseTicker,
  currentSlot,
  isLoading,
  positions,
  quoteDecimals,
  quoteTicker,
}: {
  baseDecimals: number
  baseTicker: string
  currentSlot: number | null
  isLoading: boolean
  positions: Array<TradePositionRecord>
  quoteDecimals: number
  quoteTicker: string
}) {
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all')
  const [sort, setSort] = useState<{
    direction: SortDirection
    key: OrderBookSortKey
  }>({ direction: 'asc', key: 'endSlot' })

  const rows = useMemo(() => {
    const activeRows = positions
      .filter(
        (position) =>
          currentSlot === null ||
          BigInt(Math.floor(currentSlot)) <= position.data.endSlot,
      )
      .map((position): OrderBookRow => {
        const isBuy = position.data.isBuy === 1
        const direction = isBuy ? 'Buy' : 'Sell'
        const durationSlots = position.data.endSlot - position.data.startSlot
        const normalizedDurationSlots = durationSlots > 0n ? durationSlots : 1n

        return {
          amountAtoms: position.data.amount,
          amountDecimals: isBuy ? quoteDecimals : baseDecimals,
          amountToken: isBuy ? quoteTicker : baseTicker,
          direction,
          endSlot: position.data.endSlot,
          flowAtomsPerSlot: position.data.amount / normalizedDurationSlots,
          position,
          startSlot: position.data.startSlot,
        }
      })

    const filteredRows = activeRows.filter((row) => {
      if (directionFilter === 'all') return true
      return directionFilter === 'buy'
        ? row.direction === 'Buy'
        : row.direction === 'Sell'
    })

    return filteredRows.sort((left, right) => {
      const comparison = compareOrderBookRows(left, right, sort.key)
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [
    baseDecimals,
    baseTicker,
    currentSlot,
    directionFilter,
    positions,
    quoteDecimals,
    quoteTicker,
    sort.direction,
    sort.key,
  ])

  const activeOrderCount = useMemo(
    () =>
      positions.filter(
        (position) =>
          currentSlot === null ||
          BigInt(Math.floor(currentSlot)) <= position.data.endSlot,
      ).length,
    [currentSlot, positions],
  )

  const handleSort = (key: OrderBookSortKey) => {
    setSort((current) =>
      current.key === key
        ? {
            direction: current.direction === 'asc' ? 'desc' : 'asc',
            key,
          }
        : { direction: key === 'endSlot' ? 'asc' : 'desc', key },
    )
  }

  if (isLoading && rows.length === 0) {
    return <OrderBookState>Loading active orders...</OrderBookState>
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <DirectionFilterControls
          directionFilter={directionFilter}
          onDirectionFilterChange={setDirectionFilter}
        />
        <OrderBookState>
          {activeOrderCount === 0
            ? 'No active orders are open for this market.'
            : 'No active orders match the selected direction.'}
        </OrderBookState>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <DirectionFilterControls
        directionFilter={directionFilter}
        onDirectionFilterChange={setDirectionFilter}
      />
      <div className="overflow-hidden rounded-[1.5rem] border border-white/8 bg-black/20">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[color:var(--color-page-bg)]/95 text-xs uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              <tr>
                {ORDER_BOOK_COLUMNS.map((column) => (
                  <th
                    className="border-b border-white/8 px-4 py-3 font-medium"
                    key={column.label}
                  >
                    {column.sortKey ? (
                      <button
                        className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-foreground"
                        onClick={() => handleSort(column.sortKey)}
                        type="button"
                      >
                        {column.label}
                        <SortIcon
                          active={sort.key === column.sortKey}
                          direction={sort.direction}
                        />
                      </button>
                    ) : (
                      <span className="whitespace-nowrap">{column.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className="border-b border-white/6 last:border-0"
                  key={row.position.address}
                >
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        row.direction === 'Buy' ? 'positive' : 'negative'
                      }
                    >
                      {row.direction}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                      href={formatExplorerAddressUrl(
                        row.position.address,
                        endpoint,
                      )}
                      rel="noreferrer"
                      target="_blank"
                      title={row.position.address}
                    >
                      {shortenAddress(row.position.address, 6, 6)}
                      <ExternalLink className="size-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatAtoms(row.amountAtoms, row.amountDecimals)}{' '}
                    {row.amountToken}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatAtoms(row.flowAtomsPerSlot, row.amountDecimals)}{' '}
                    {row.amountToken}/slot
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.startSlot.toString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.endSlot.toString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function DirectionFilterControls({
  directionFilter,
  onDirectionFilterChange,
}: {
  directionFilter: DirectionFilter
  onDirectionFilterChange: (value: DirectionFilter) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {DIRECTION_FILTERS.map((filter) => (
        <Button
          aria-pressed={directionFilter === filter.value}
          className="rounded-full"
          key={filter.value}
          onClick={() => onDirectionFilterChange(filter.value)}
          size="xs"
          variant={directionFilter === filter.value ? 'default' : 'outline'}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  )
}

function compareOrderBookRows(
  left: OrderBookRow,
  right: OrderBookRow,
  key: OrderBookSortKey,
) {
  switch (key) {
    case 'direction':
      return left.direction.localeCompare(right.direction)
    case 'flow':
      return compareBigint(left.flowAtomsPerSlot, right.flowAtomsPerSlot)
    case 'size':
      return compareBigint(left.amountAtoms, right.amountAtoms)
    case 'startSlot':
      return compareBigint(left.startSlot, right.startSlot)
    case 'endSlot':
      return compareBigint(left.endSlot, right.endSlot)
  }
}

function compareBigint(left: bigint, right: bigint) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: SortDirection
}) {
  const Icon = active
    ? direction === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown

  return (
    <Icon
      className={cn(
        'size-3.5',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    />
  )
}

function OrderBookState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[1.5rem] border border-white/8 bg-white/5 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
