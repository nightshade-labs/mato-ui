import { useEffect, useState } from 'react'
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

const STORAGE_KEY = 'mato-risk-disclaimer-accepted'

export function RiskDisclaimerDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const today = new Date().toISOString().slice(0, 10)
    if (stored !== today) setOpen(true)
  }, [])

  const handleAccept = () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(STORAGE_KEY, today)
    setOpen(false)
  }

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="size-5" />
            <DialogTitle>Experimental Protocol</DialogTitle>
          </div>
          <DialogDescription>
            This application is in an early experimental phase. Liquidity is low
            and smart contracts have not been fully audited. There is a
            significant risk of losing some or all of your funds.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleAccept} className="w-full rounded-xl">
            I understand the risks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
