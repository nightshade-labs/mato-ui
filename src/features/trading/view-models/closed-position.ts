import type { ClosePositionEvent } from '@/integrations/supabase'
import { computeAveragePrice } from '../lib/market'

function subtractFloorZero(minuend: bigint, subtrahend: bigint) {
  if (minuend <= subtrahend) return 0n
  return minuend - subtrahend
}

export function buildClosedPositionSummary({
  baseDecimals,
  baseTicker,
  event,
  quoteDecimals,
  quoteTicker,
}: {
  baseDecimals: number
  baseTicker: string
  event: ClosePositionEvent
  quoteDecimals: number
  quoteTicker: string
}) {
  const isBuy = event.is_buy === 1
  const sideLabel = isBuy ? 'Buy' : 'Sell'
  const flowLabel = isBuy
    ? `${quoteTicker} -> ${baseTicker}`
    : `${baseTicker} -> ${quoteTicker}`
  const depositToken = isBuy ? quoteTicker : baseTicker
  const depositDecimals = isBuy ? quoteDecimals : baseDecimals
  const swappedToken = isBuy ? baseTicker : quoteTicker
  const swappedDecimals = isBuy ? baseDecimals : quoteDecimals

  const depositedAtoms = event.deposit_amount
  const remainingAtoms = event.remaining_amount
  const consumedAtoms = subtractFloorZero(depositedAtoms, remainingAtoms)
  const swappedAtoms = event.swapped_amount
  const feeAtoms = event.fee_amount
  const receivedAtoms = subtractFloorZero(swappedAtoms, feeAtoms)

  const grossQuoteAtoms = isBuy ? consumedAtoms : swappedAtoms
  const grossBaseAtoms = isBuy ? swappedAtoms : consumedAtoms
  const averageFillPrice = computeAveragePrice(
    grossQuoteAtoms,
    quoteDecimals,
    grossBaseAtoms,
    baseDecimals,
  )
  const effectiveQuoteAtoms = isBuy ? consumedAtoms : receivedAtoms
  const effectiveBaseAtoms = isBuy ? receivedAtoms : consumedAtoms
  const effectivePrice = computeAveragePrice(
    effectiveQuoteAtoms,
    quoteDecimals,
    effectiveBaseAtoms,
    baseDecimals,
  )

  return {
    averageFillPrice,
    consumedAtoms,
    depositDecimals,
    depositToken,
    feeAtoms,
    flowLabel,
    effectivePrice,
    isBuy,
    receivedAtoms,
    remainingAtoms,
    sideLabel,
    swappedAtoms,
    swappedDecimals,
    swappedToken,
  }
}
