import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from './client'
import type { MarketUpdateEvent, MarketUpdateEventRow } from './types'
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
    select: (data) => data.map(parseMarketUpdateEvent),
  })
}

export function useMarketUpdatesByMarketId(marketId: number) {
  return useQuery({
    queryKey: ['market-updates', marketId],
    queryFn: () => fetchMarketUpdatesByMarketId(marketId),
    select: (data) => data.map(parseMarketUpdateEvent),
  })
}

export function useMarketUpdatesRealtime(marketId?: number) {
  const [updates, setUpdates] = useState<MarketUpdateEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const { data: initialData, isLoading } = marketId
    ? useMarketUpdatesByMarketId(marketId)
    : useMarketUpdates()

  useEffect(() => {
    if (initialData) {
      setUpdates(initialData)
    }
  }, [initialData])

  useEffect(() => {
    const channel = supabase
      .channel('market-updates-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_update_events',
          ...(marketId && { filter: `market_id=eq.${marketId}` }),
        },
        (payload) => {
          const newEvent = parseMarketUpdateEvent(
            payload.new as MarketUpdateEventRow,
          )
          setUpdates((prev) => [newEvent, ...prev])
        },
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [marketId])

  return { data: updates, isLoading, isConnected }
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
