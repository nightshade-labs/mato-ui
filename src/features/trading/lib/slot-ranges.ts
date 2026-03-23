export interface SlotRange {
  endSlot: number
  startSlot: number
}

interface SlotPointLike {
  slot: number
}

function isFiniteSlot(value: number) {
  return Number.isFinite(value) && Number.isInteger(value)
}

export function isValidSlotRange(range: SlotRange | null | undefined): range is SlotRange {
  if (!range) return false
  return (
    isFiniteSlot(range.startSlot) &&
    isFiniteSlot(range.endSlot) &&
    range.startSlot <= range.endSlot
  )
}

export function sortSlotRanges(ranges: SlotRange[]) {
  return [...ranges].sort((left, right) => {
    if (left.startSlot === right.startSlot) {
      return left.endSlot - right.endSlot
    }
    return left.startSlot - right.startSlot
  })
}

export function mergeOverlappingRanges(ranges: SlotRange[]) {
  const sorted = sortSlotRanges(ranges.filter(isValidSlotRange))
  if (sorted.length === 0) return []

  const merged: SlotRange[] = [sorted[0]]

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]
    const previous = merged[merged.length - 1]

    if (current.startSlot <= previous.endSlot) {
      previous.endSlot = Math.max(previous.endSlot, current.endSlot)
      continue
    }

    merged.push({ ...current })
  }

  return merged
}

export function mergeAdjacentRanges(ranges: SlotRange[], maxGapSlots = 0) {
  const sorted = sortSlotRanges(ranges.filter(isValidSlotRange))
  if (sorted.length === 0) return []

  const merged: SlotRange[] = [{ ...sorted[0] }]

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]
    const previous = merged[merged.length - 1]
    const gap = current.startSlot - previous.endSlot - 1

    if (gap <= maxGapSlots) {
      previous.endSlot = Math.max(previous.endSlot, current.endSlot)
      continue
    }

    merged.push({ ...current })
  }

  return merged
}

function clipRangeToRequest(range: SlotRange, requestedRange: SlotRange): SlotRange | null {
  const startSlot = Math.max(range.startSlot, requestedRange.startSlot)
  const endSlot = Math.min(range.endSlot, requestedRange.endSlot)

  if (startSlot > endSlot) {
    return null
  }

  return { endSlot, startSlot }
}

export function subtractCoveredRanges(requestedRange: SlotRange, loadedRanges: SlotRange[]) {
  if (!isValidSlotRange(requestedRange)) {
    return []
  }

  const clippedCoverage = mergeAdjacentRanges(
    loadedRanges
      .filter(isValidSlotRange)
      .map((range) => clipRangeToRequest(range, requestedRange))
      .filter((range): range is SlotRange => range !== null),
    0,
  )

  if (clippedCoverage.length === 0) {
    return [{ ...requestedRange }]
  }

  const missing: SlotRange[] = []
  let cursor = requestedRange.startSlot

  for (const coveredRange of clippedCoverage) {
    if (coveredRange.startSlot > cursor) {
      missing.push({
        endSlot: coveredRange.startSlot - 1,
        startSlot: cursor,
      })
    }

    cursor = Math.max(cursor, coveredRange.endSlot + 1)
    if (cursor > requestedRange.endSlot) {
      return missing
    }
  }

  if (cursor <= requestedRange.endSlot) {
    missing.push({
      endSlot: requestedRange.endSlot,
      startSlot: cursor,
    })
  }

  return missing
}

export function hasFullCoverage(loadedRanges: SlotRange[], requestedRange: SlotRange) {
  return subtractCoveredRanges(requestedRange, loadedRanges).length === 0
}

export function insertNormalizedHistory<T extends SlotPointLike>(points: T[], incomingPoints: T[]) {
  const mergedBySlot = new Map<number, T>()

  for (const point of points) {
    mergedBySlot.set(point.slot, point)
  }

  for (const point of incomingPoints) {
    mergedBySlot.set(point.slot, point)
  }

  return Array.from(mergedBySlot.values()).sort((left, right) => left.slot - right.slot)
}

export function selectPointsForRange<T extends SlotPointLike>(points: T[], requestedRange: SlotRange) {
  if (!isValidSlotRange(requestedRange) || points.length === 0) {
    return []
  }

  let anchorIndex = -1
  let firstIncludedIndex = -1
  let lastIncludedIndex = -1

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]

    if (point.slot <= requestedRange.startSlot) {
      anchorIndex = index
    }

    if (point.slot >= requestedRange.startSlot && point.slot <= requestedRange.endSlot) {
      if (firstIncludedIndex === -1) {
        firstIncludedIndex = index
      }
      lastIncludedIndex = index
    }

    if (point.slot > requestedRange.endSlot) {
      break
    }
  }

  if (firstIncludedIndex === -1) {
    return anchorIndex >= 0 ? points.slice(anchorIndex, anchorIndex + 1) : []
  }

  const sliceStart = anchorIndex >= 0 ? Math.min(anchorIndex, firstIncludedIndex) : firstIncludedIndex
  return points.slice(sliceStart, lastIncludedIndex + 1)
}
