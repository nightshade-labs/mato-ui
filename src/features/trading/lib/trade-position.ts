import type { TradePosition } from '@/lib/generated/twob/src/generated/accounts'
import { Side } from '@/lib/generated/twob/src/generated/types'

export function getTradePositionEndSlot(
  position: Pick<TradePosition, 'lastUpdateSlot' | 'remainingSlots'>,
) {
  return position.lastUpdateSlot + BigInt(position.remainingSlots)
}

export function isBuyTradePosition(position: Pick<TradePosition, 'side'>) {
  return position.side === Side.Buy
}
