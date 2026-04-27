import { useQuery } from '@tanstack/react-query'
import type { MarketUpdateEvent } from './types'
import { parseMarketUpdateEvent, parseClosePositionEvent } from './types'
import {
  getMarketUpdates,
  fetchMarketUpdatesByMarketId,
  getClosedPositions,
  fetchClosedPositionsByAuthority,
} from '@/data/supabase'

export function useMarketUpdates() {
  return useQuery({
    queryKey: ['market-updates'],
    queryFn: () => getMarketUpdates(),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    select: (data) => data.map(parseMarketUpdateEvent),
  })
}

export function useMarketUpdatesByMarketId(marketId: number) {
  return useQuery({
    queryKey: ['market-updates', marketId],
    queryFn: () => fetchMarketUpdatesByMarketId(marketId),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    select: (data) => data.map(parseMarketUpdateEvent),
  })
}

export function useMarketUpdatesRealtime(marketId?: number) {
  const query = marketId
    ? useMarketUpdatesByMarketId(marketId)
    : useMarketUpdates()

  return {
    data: (query.data ?? []) as Array<MarketUpdateEvent>,
    isLoading: query.isLoading,
    isConnected: !query.isLoading && !query.isError,
  }
}

export function useClosedPositions() {
  return useQuery({
    queryKey: ['closed-positions'],
    queryFn: () => getClosedPositions(),
    select: (data) => data.map(parseClosePositionEvent),
  })
}

export function useClosedPositionsByAuthority(authority: string) {
  return useQuery({
    queryKey: ['closed-positions', authority],
    queryFn: () => fetchClosedPositionsByAuthority(authority),
    select: (data) => data.map(parseClosePositionEvent),
    enabled: !!authority,
  })
}
