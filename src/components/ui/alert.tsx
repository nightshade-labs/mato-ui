import * as React from 'react'
import { cn } from '@/lib/utils'

function Alert({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-foreground shadow-sm backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Alert }
