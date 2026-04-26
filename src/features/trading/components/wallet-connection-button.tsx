import { useEffect, useRef, useState } from 'react'
import { useWalletConnection } from '@solana/react-hooks'
import { Check, ChevronDown, Copy, HandCoins, LogOut, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { shortenAddress } from '../lib/format'
import { useReclaimRent } from '../hooks/use-reclaim-rent'

export function WalletConnectionButton() {
  const {
    connect,
    connected,
    connectors,
    currentConnector,
    disconnect,
    isReady,
    status,
    wallet,
  } = useWalletConnection()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const reclaimRent = useReclaimRent(open && connected)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (dropdownRef.current?.contains(target)) return

      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  useEffect(() => {
    if (open) return
    reclaimRent.clearFeedback()
  }, [open, reclaimRent.clearFeedback])

  if (!isReady) {
    return (
      <Button
        size="lg"
        variant="outline"
        className="min-w-[13rem] justify-between rounded-full px-5"
      >
        <span className="text-sm text-muted-foreground">Loading wallets</span>
      </Button>
    )
  }

  const address = wallet?.account.address.toString() ?? null

  const handleCopyAddress = async () => {
    if (!address || typeof navigator === 'undefined' || !navigator.clipboard)
      return

    await navigator.clipboard.writeText(address)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  const showReclaimRentButton = connected && reclaimRent.closeableCount > 0

  return (
    <div ref={dropdownRef} className="relative z-[70]">
      <Button
        size="lg"
        variant="outline"
        className="max-w-full min-w-[13rem] justify-between rounded-full border-white/10 bg-white/5 px-5 hover:bg-white/10"
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Wallet className="size-4" />
          <span className="truncate">
            {connected ? shortenAddress(address, 4, 4) : 'Connect wallet'}
          </span>
        </span>
        <ChevronDown
          className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </Button>

      {open ? (
        <Card className="absolute right-0 z-[80] mt-3 w-[19rem] border-white/10 bg-[color:var(--color-elevated)]/95 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75)]">
          <CardContent className="space-y-3 p-4">
            {connected ? (
              <>
                <div className="max-w-full rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="accent">Connected</Badge>
                    {currentConnector ? (
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {currentConnector.name}
                      </span>
                    ) : null}
                  </div>
                  <button
                    className="flex max-w-full items-center gap-2 text-left font-mono text-sm leading-6 text-foreground transition-colors hover:text-[color:var(--color-accent-strong)]"
                    onClick={() => {
                      void handleCopyAddress()
                    }}
                    type="button"
                  >
                    {copied ? (
                      <Check className="size-4 shrink-0" />
                    ) : (
                      <Copy className="size-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {shortenAddress(address, 4, 4)}
                    </span>
                  </button>
                </div>
                {showReclaimRentButton ? (
                  <Button
                    className="w-full justify-between rounded-xl"
                    disabled={reclaimRent.isReclaiming}
                    variant="outline"
                    onClick={() => {
                      void reclaimRent.reclaimRent()
                    }}
                  >
                    {reclaimRent.isReclaiming ? 'Reclaiming rent...' : 'Reclaim Rent'}
                    <HandCoins className="size-4" />
                  </Button>
                ) : null}
                <Button
                  className="w-full justify-between rounded-xl"
                  variant="outline"
                  onClick={() => {
                    reclaimRent.reset()
                    void disconnect()
                    setOpen(false)
                  }}
                >
                  Disconnect
                  <LogOut className="size-4" />
                </Button>
                {reclaimRent.status === 'success' ? (
                  <p className="text-sm text-emerald-300">
                    Reclaimed rent from {reclaimRent.reclaimedCount} account
                    {reclaimRent.reclaimedCount === 1 ? '' : 's'}.
                  </p>
                ) : null}
                {reclaimRent.error ? (
                  <p className="text-sm text-destructive">{reclaimRent.error}</p>
                ) : null}
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Wallet Standard
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Choose a desktop wallet. The web app uses Wallet Standard
                    instead of the mobile adapter.
                  </p>
                </div>
                <div className="space-y-2">
                  {connectors.map((connector) => (
                    <Button
                      key={connector.id}
                      className="w-full justify-between rounded-xl"
                      variant="outline"
                      onClick={() => {
                        void connect(connector.id, { autoConnect: true })
                        setOpen(false)
                      }}
                    >
                      {connector.name}
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Connect
                      </span>
                    </Button>
                  ))}
                </div>
              </>
            )}

            {status === 'error' ? (
              <p className="text-sm text-destructive">
                Wallet connection failed. Try another connector.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
