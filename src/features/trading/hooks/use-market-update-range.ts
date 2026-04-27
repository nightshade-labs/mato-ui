import { useQuery } from '@tanstack/react-query'
import { tradingQueries } from '../queries'

export function useMarketUpdateRange({
  marketId,
  startSlot,
  endSlot,
  enabled = true,
}: {
  marketId: number
  startSlot: number | null
  endSlot: number | null
  enabled?: boolean
}) {
  const isEnabled =
    enabled && startSlot !== null && endSlot !== null && startSlot <= endSlot

  return useQuery({
    ...tradingQueries.marketUpdateRange({ endSlot, marketId, startSlot }),
    enabled: isEnabled,
  })
}
