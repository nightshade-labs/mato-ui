import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function HighPriceImpactDialog({
  estimatedConversionText,
  executionPriceDisplay,
  isSubmitting,
  onConfirm,
  onOpenChange,
  open,
  priceImpactDisplay,
  thresholdDisplay,
}: {
  estimatedConversionText: string
  executionPriceDisplay: string
  isSubmitting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  priceImpactDisplay: string
  thresholdDisplay: string
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="size-5" />
            <DialogTitle>High Price Impact</DialogTitle>
          </div>
          <DialogDescription>
            This order is above the {thresholdDisplay} price impact warning
            threshold. Confirm only if you accept the estimated execution price.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <ImpactDetail label="Price impact" value={priceImpactDisplay} />
          <ImpactDetail label="Execution price" value={executionPriceDisplay} />
          <ImpactDetail
            label="Estimated receive"
            value={estimatedConversionText}
          />
        </div>

        <DialogFooter>
          <Button
            className="rounded-xl"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Review order
          </Button>
          <Button
            className="rounded-xl"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? 'Submitting...' : 'Submit anyway'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImpactDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className="break-words font-medium text-foreground sm:text-right">
        {value}
      </span>
    </div>
  )
}
