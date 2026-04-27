import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSolanaClient } from '@solana/react-hooks'
import type { Address } from '@solana/kit'
import { ARRAY_LENGTH } from '../constants'
import { resolveSnapshotLocation } from '../api/twob-client'
import { tradingQueries } from '../queries'

export function useEndSlotBookkeepingSnapshot({
  marketAddress,
  endSlot,
  endSlotInterval,
  currentSlot,
  isBuy,
  enabled = true,
}: {
  marketAddress: Address
  endSlot: number
  endSlotInterval: number | null
  currentSlot: number | null
  isBuy: boolean
  enabled?: boolean
}) {
  const client = useSolanaClient()

  const snapshotLocation = useMemo(() => {
    if (endSlotInterval === null) return null
    return resolveSnapshotLocation(endSlot, endSlotInterval)
  }, [endSlot, endSlotInterval])

  const snapshotReadySlot = useMemo(() => {
    if (endSlotInterval === null || endSlotInterval <= 0) return null
    return endSlot + ARRAY_LENGTH * endSlotInterval
  }, [endSlot, endSlotInterval])

  const isSnapshotLikelyReady = useMemo(() => {
    if (currentSlot === null || snapshotReadySlot === null) return false
    return currentSlot >= snapshotReadySlot
  }, [currentSlot, snapshotReadySlot])

  return useQuery({
    ...tradingQueries.endSlotSnapshot({
      client,
      currentSlot,
      endSlot,
      endSlotInterval,
      isBuy,
      marketAddress,
    }),
    enabled: enabled && snapshotLocation !== null && isSnapshotLikelyReady,
    refetchInterval: ({ state }) => {
      if (!enabled || snapshotLocation === null || !isSnapshotLikelyReady)
        return false
      return state.data === null ? 2_000 : false
    },
  })
}
