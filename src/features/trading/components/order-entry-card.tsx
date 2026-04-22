import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import type { OrderSide } from '../constants'
import { DURATION_OPTIONS } from '../constants'
import { formatUiAmount } from '../lib/format'

export function OrderEntryCard({
  amountInput,
  amountTokenTicker,
  availableAmountDisplay,
  canSubmit,
  durationSeconds,
  estimatedConversionText,
  executionPriceDisplay,
  isConnected,
  onAmountChange,
  onDurationChange,
  onMaxClick,
  onPercentSelect,
  onSideChange,
  onSliderChange,
  onSubmit,
  priceImpactDisplay,
  selectedPercent,
  side,
  statusLabel,
  validationError,
}: {
  amountInput: string
  amountTokenTicker: string
  availableAmountDisplay: number
  canSubmit: boolean
  durationSeconds: number
  estimatedConversionText: string
  executionPriceDisplay: string
  isConnected: boolean
  onAmountChange: (value: string) => void
  onDurationChange: (seconds: number) => void
  onMaxClick: () => void
  onPercentSelect: (percent: number) => void
  onSideChange: (side: OrderSide) => void
  onSliderChange: (value: number) => void
  onSubmit: () => void
  priceImpactDisplay: string
  selectedPercent: number
  side: OrderSide
  statusLabel: string
  validationError: string | null
}) {
  return (
    <Card className="border-white/10 bg-black/20">
      <CardHeader>
        <CardTitle>Create order</CardTitle>
        <CardDescription>
          Submit time-weighted TWOB orders with the same execution model as the
          mobile app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
          <Button
            className="rounded-xl"
            onClick={() => onSideChange('buy')}
            variant={side === 'buy' ? 'default' : 'ghost'}
          >
            Buy
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => onSideChange('sell')}
            variant={side === 'sell' ? 'default' : 'ghost'}
          >
            Sell
          </Button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <label
                className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
                htmlFor="order-amount"
              >
                Order size
              </label>
              <div className="mt-1 text-sm text-muted-foreground">
                Available {formatUiAmount(availableAmountDisplay)}{' '}
                {amountTokenTicker}
              </div>
            </div>
            <Button
              className="rounded-full px-3"
              onClick={onMaxClick}
              size="xs"
              variant="outline"
            >
              Use max
            </Button>
          </div>

          <div className="rounded-[1.25rem] border border-white/10 bg-black/25 p-2">
            <div className="flex items-center gap-3">
              <Input
                autoComplete="off"
                className="h-14 border-0 bg-transparent px-3 text-2xl font-semibold shadow-none focus-visible:ring-0"
                id="order-amount"
                inputMode="decimal"
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder="0.00"
                value={amountInput}
              />
              <Badge
                className="shrink-0 rounded-full px-3 py-2 text-sm"
                variant="muted"
              >
                {amountTokenTicker}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedPercent.toFixed(2)}% of available balance
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <input
            aria-label="Use balance percentage"
            className="w-full accent-[var(--color-accent-strong)]"
            max={100}
            min={0}
            onChange={(event) => onSliderChange(Number(event.target.value))}
            type="range"
            value={selectedPercent}
          />
          <div className="flex flex-wrap gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <Button
                key={percent}
                className="rounded-full px-3"
                onClick={() => onPercentSelect(percent)}
                size="xs"
                variant={
                  Math.abs(selectedPercent - percent) < 0.01
                    ? 'default'
                    : 'outline'
                }
              >
                {percent}%
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailMetric
            label="Estimated receive"
            value={estimatedConversionText}
          />
          <DetailMetric
            label="Price impact"
            value={`${priceImpactDisplay} (${executionPriceDisplay})`}
          />
        </div>

        <div className="space-y-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Duration
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {DURATION_OPTIONS.map((option) => (
              <Button
                key={option.label}
                className="rounded-full whitespace-nowrap"
                onClick={() => onDurationChange(option.seconds)}
                size="xs"
                variant={
                  durationSeconds === option.seconds ? 'default' : 'outline'
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {validationError ? (
          <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
            {validationError}
          </Alert>
        ) : null}

        <Button
          className="h-12 w-full rounded-2xl text-base"
          disabled={!isConnected || !canSubmit}
          onClick={onSubmit}
        >
          {statusLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
