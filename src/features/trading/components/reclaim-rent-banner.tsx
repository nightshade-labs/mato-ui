import { AlertTriangle, HandCoins } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function ReclaimRentBanner({
  closeableCount,
  isReclaiming,
  nativeSolWarning,
  onReclaim,
}: {
  closeableCount: number
  isReclaiming: boolean
  nativeSolWarning: string | null
  onReclaim: () => void
}) {
  if (closeableCount <= 0) return null

  const accountLabel = closeableCount === 1 ? 'account' : 'accounts'

  return (
    <Alert className="mb-5 border-warning/40 bg-warning/10 text-warning-foreground shadow-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
            <HandCoins className="size-4.5" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-foreground">
              Rent is ready to reclaim
            </p>
            <p className="text-sm leading-6">
              Close {closeableCount} stale market {accountLabel} and return the
              rent to your wallet.
            </p>
            {nativeSolWarning ? (
              <p className="flex items-start gap-2 text-xs leading-5">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{nativeSolWarning}</span>
              </p>
            ) : null}
          </div>
        </div>
        <Button
          className="w-full rounded-full sm:w-auto"
          disabled={isReclaiming}
          onClick={onReclaim}
        >
          {isReclaiming ? 'Reclaiming...' : 'Reclaim rent'}
          <HandCoins className="size-4" />
        </Button>
      </div>
    </Alert>
  )
}
