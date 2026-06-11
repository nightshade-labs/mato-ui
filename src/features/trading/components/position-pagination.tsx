import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PositionPagination({
  itemLabel,
  onPageChange,
  page,
  pageCount,
  pageSize,
  totalItems,
}: {
  itemLabel: string
  onPageChange: (page: number) => void
  page: number
  pageCount: number
  pageSize: number
  totalItems: number
}) {
  if (totalItems <= pageSize) return null

  const from = page * pageSize + 1
  const to = Math.min(totalItems, (page + 1) * pageSize)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
      <span className="text-sm text-muted-foreground">
        {from}-{to} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <Button
          aria-label="Previous page"
          className="rounded-full"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <span className="min-w-14 text-center text-sm text-muted-foreground">
          {page + 1}/{pageCount}
        </span>
        <Button
          aria-label="Next page"
          className="rounded-full"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
