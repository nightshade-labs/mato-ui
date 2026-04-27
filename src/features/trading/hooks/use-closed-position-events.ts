import { useQuery } from '@tanstack/react-query'
import { tradingQueries } from '../queries'

export function useClosedPositionEvents({
  positionAuthority,
  marketId,
  limit = 50,
}: {
  positionAuthority: string
  marketId?: number
  limit?: number
}) {
  return useQuery({
    ...tradingQueries.closedPositions({
      limit,
      marketId,
      positionAuthority,
    }),
    enabled: Boolean(positionAuthority),
  })
}
