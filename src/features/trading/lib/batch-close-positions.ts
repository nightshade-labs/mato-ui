import { getTradePositionEndSlot } from './trade-position'

export type BatchCloseMode = 'ended' | 'all'

type BatchClosePositionLike = {
  address: string
  data: {
    lastUpdateSlot: bigint
    remainingSlots: number
  }
}

function compareByEndSlotThenAddress(
  left: BatchClosePositionLike,
  right: BatchClosePositionLike,
) {
  const leftEndSlot = getTradePositionEndSlot(left.data)
  const rightEndSlot = getTradePositionEndSlot(right.data)

  if (leftEndSlot < rightEndSlot) return -1
  if (leftEndSlot > rightEndSlot) return 1
  return left.address.localeCompare(right.address)
}

export function isEndedPosition(
  position: BatchClosePositionLike,
  currentSlot: number | null,
) {
  if (currentSlot === null) return false
  return (
    BigInt(Math.floor(currentSlot)) > getTradePositionEndSlot(position.data)
  )
}

export function selectBatchClosePositions<T extends BatchClosePositionLike>({
  currentSlot,
  maxPositions,
  mode,
  positions,
}: {
  currentSlot: number | null
  maxPositions: number
  mode: BatchCloseMode
  positions: Array<T>
}) {
  const limit = Math.max(0, Math.floor(maxPositions))
  const candidates =
    mode === 'ended'
      ? positions.filter((position) => isEndedPosition(position, currentSlot))
      : positions

  return [...candidates].sort(compareByEndSlotThenAddress).slice(0, limit)
}
