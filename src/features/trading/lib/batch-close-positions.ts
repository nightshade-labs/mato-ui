export type BatchCloseMode = 'ended' | 'all'

type BatchClosePositionLike = {
  address: string
  data: {
    endSlot: bigint
  }
}

function compareByEndSlotThenAddress(
  left: BatchClosePositionLike,
  right: BatchClosePositionLike,
) {
  if (left.data.endSlot < right.data.endSlot) return -1
  if (left.data.endSlot > right.data.endSlot) return 1
  return left.address.localeCompare(right.address)
}

export function isEndedPosition(
  position: BatchClosePositionLike,
  currentSlot: number | null,
) {
  if (currentSlot === null) return false
  return BigInt(Math.floor(currentSlot)) > position.data.endSlot
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
