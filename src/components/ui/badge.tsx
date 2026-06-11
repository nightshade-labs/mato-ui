import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
  {
    variants: {
      variant: {
        default: 'border-border/70 bg-secondary/80 text-secondary-foreground',
        positive: 'border-positive/30 bg-positive/12 text-positive-foreground',
        negative: 'border-negative/30 bg-negative/12 text-negative-foreground',
        muted: 'border-border/50 bg-background/40 text-muted-foreground',
        accent:
          'border-[color:var(--color-accent-strong)]/35 bg-[color:var(--color-accent-strong)]/10 text-[color:var(--color-accent-warm)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  )
}

export { Badge, badgeVariants }
