import { useQuery } from '@tanstack/react-query'
import { tradingQueries } from '../queries'

export function useClosedPositionEvents({
  createdAfter,
  positionAuthority,
  marketId,
  limit = 50,
}: {
  createdAfter?: string
  positionAuthority: string
  marketId?: number
  limit?: number
}) {
  return useQuery({
    ...tradingQueries.closedPositions({
      createdAfter,
      limit,
      marketId,
      positionAuthority,
    }),
    enabled: Boolean(positionAuthority),
  })
}
