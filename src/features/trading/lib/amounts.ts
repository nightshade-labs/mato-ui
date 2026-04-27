import { NATIVE_FEE_BUFFER_ATOMS, SLOT_DURATION_SECONDS } from '../constants'

export function sanitizeAmountInput(raw: string) {
  const normalized = raw.replace(/,/g, '.').replace(/[^\d.]/g, '')
  const [whole, ...fractionParts] = normalized.split('.')
  if (fractionParts.length === 0) return whole
  return `${whole}.${fractionParts.join('')}`
}

export function parseTokenAmount(input: string, decimals: number) {
  const cleaned = input.replace(/[^\d.]/g, '')
  const parts = cleaned.split('.')
  if (parts.length > 2) return null

  const wholePart = parts[0] || '0'
  const decimalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals)

  try {
    return BigInt(wholePart + decimalPart)
  } catch {
    return null
  }
}

export function formatAtomsToInput(balanceAtoms: bigint, decimals: number) {
  if (balanceAtoms <= 0n) return ''
  if (decimals <= 0) return balanceAtoms.toString()

  const divisor = 10n ** BigInt(decimals)
  const whole = balanceAtoms / divisor
  const fraction = (balanceAtoms % divisor)
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
  return fraction.length === 0
    ? whole.toString()
    : `${whole.toString()}.${fraction}`
}

export function getSpendableNativeAtoms(
  lamports: bigint | null,
  wrappedAmount: bigint | null,
) {
  const liquidLamports = lamports ?? 0n
  const wrappedAtoms = wrappedAmount ?? 0n
  const spendableLamports =
    liquidLamports > NATIVE_FEE_BUFFER_ATOMS
      ? liquidLamports - NATIVE_FEE_BUFFER_ATOMS
      : 0n
  return spendableLamports + wrappedAtoms
}

export function getSpendableTokenAtoms(balanceAtoms: bigint | null) {
  return balanceAtoms ?? 0n
}

export function toSliderPercent(
  amountAtoms: bigint | null,
  availableAtoms: bigint | null,
) {
  if (!amountAtoms || amountAtoms <= 0n) return 0
  if (!availableAtoms || availableAtoms <= 0n) return 0
  const clamped = amountAtoms > availableAtoms ? availableAtoms : amountAtoms
  return Number((clamped * 10_000n) / availableAtoms) / 100
}

export function atomsFromPercent(availableAtoms: bigint, percent: number) {
  const clamped = Math.min(100, Math.max(0, percent))
  const basisPoints = BigInt(Math.round(clamped * 100))
  return (availableAtoms * basisPoints) / 10_000n
}

export function durationToSlots(seconds: number) {
  return Math.max(1, Math.round(seconds / SLOT_DURATION_SECONDS))
}
