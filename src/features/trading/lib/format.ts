export function shortenAddress(
  value: string | null | undefined,
  start = 4,
  end = 4,
) {
  if (!value) return 'N/A'
  if (value.length <= start + end + 3) return value
  return `${value.slice(0, start)}...${value.slice(-end)}`
}

export function formatAtoms(
  amountAtoms: bigint,
  decimals: number,
  maxDecimals = 6,
) {
  if (amountAtoms <= 0n) return '0'
  if (decimals <= 0) return amountAtoms.toString()

  const divisor = 10n ** BigInt(decimals)
  const whole = amountAtoms / divisor
  const fraction = (amountAtoms % divisor)
    .toString()
    .padStart(decimals, '0')
    .slice(0, Math.min(decimals, maxDecimals))
    .replace(/0+$/, '')

  return fraction ? `${whole.toString()}.${fraction}` : whole.toString()
}

export function formatUiAmount(value: number | null, maxDecimals = 6) {
  if (value === null || !Number.isFinite(value)) return '—'
  if (value === 0) return '0'

  const precision = value >= 1 ? Math.min(maxDecimals, 4) : maxDecimals
  return value.toFixed(precision).replace(/0+$/, '').replace(/\.$/, '')
}

export function formatCompactNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—'
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toFixed(2)
}

export function formatSignedNumber(value: number, decimals: number) {
  const absolute = Math.abs(value).toFixed(decimals)
  return `${value >= 0 ? '+' : '-'}${absolute}`
}

export function formatPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '—'
  if (value >= 1) return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
}

export function formatExplorerTransactionUrl(
  signature: string,
  endpoint: string,
) {
  const cluster = endpoint.includes('mainnet')
    ? 'mainnet-beta'
    : endpoint.includes('testnet')
      ? 'testnet'
      : endpoint.includes('localhost') || endpoint.includes('127.0.0.1')
        ? 'custom'
        : 'devnet'

  if (cluster === 'custom') {
    return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=custom`
  }

  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=${encodeURIComponent(cluster)}`
}

export function formatCrosshairTimeLabel(value: number | string | null) {
  if (value === null) return null
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return null

  const date = new Date(numeric * 1000)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
