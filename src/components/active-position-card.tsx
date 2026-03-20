import { ArrowRight } from 'lucide-react'
import type { ActivePositionProps } from '@/lib/types/position'

function formatAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const fraction = amount % divisor
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4)
  return `${whole}.${fractionStr}`
}

function formatTime(slots: bigint): string {
  const ms = Number(slots) * 400
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `~${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `~${minutes}m`
  }
  return `~${seconds}s`
}

export default function ActivePositionCard({
  position,
  currentSlot,
  inputMint,
  outputMint,
  amountReceived,
}: ActivePositionProps) {
  const totalSlots = position.endSlot - position.startSlot
  const elapsedSlots =
    currentSlot > position.startSlot
      ? currentSlot < position.endSlot
        ? currentSlot - position.startSlot
        : totalSlots
      : BigInt(0)
  const remainingSlots = totalSlots - elapsedSlots

  const progress =
    totalSlots > 0 ? Number((elapsedSlots * BigInt(100)) / totalSlots) : 0

  const amountSpent = (position.amount * elapsedSlots) / totalSlots
  const amountRemaining = position.amount - amountSpent
  const ratePerSlot = totalSlots > 0 ? position.amount / totalSlots : BigInt(0)

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-semibold text-white">
          {inputMint.symbol}
        </span>
        <ArrowRight size={20} className="text-gray-400" />
        <span className="text-lg font-semibold text-white">
          {outputMint.symbol}
        </span>
        <span className="ml-auto text-sm text-gray-400">
          {position.isBuy ? 'Buy' : 'Sell'}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-400">Total</div>
          <div className="text-white font-medium">
            {formatAmount(position.amount, inputMint.decimals)}{' '}
            {inputMint.symbol}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-400">
            {' '}
            {position.isBuy ? 'Spent' : 'Sold'}
          </div>
          <div className="text-white font-medium">
            {formatAmount(amountSpent, inputMint.decimals)} {inputMint.symbol}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-400">Remaining</div>
          <div className="text-white font-medium">
            {formatAmount(amountRemaining, inputMint.decimals)}{' '}
            {inputMint.symbol}
          </div>
        </div>
        {amountReceived !== undefined && (
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-400">Received</div>
            <div className="text-cyan-400 font-medium">
              {formatAmount(amountReceived, outputMint.decimals)}{' '}
              {outputMint.symbol}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between text-sm text-gray-400">
        <div>
          <span className="text-gray-500">Slots: </span>
          {elapsedSlots.toString()} / {totalSlots.toString()}
        </div>
        <div>
          <span className="text-gray-500">Flow: </span>
          {formatAmount(ratePerSlot, inputMint.decimals)} SOL/slot
        </div>
      </div>
      <div className="text-sm text-gray-400 mt-1">
        <span className="text-gray-500">Est. remaining: </span>
        {formatTime(remainingSlots)}
      </div>
    </div>
  )
}
