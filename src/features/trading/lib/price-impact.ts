import { HIGH_PRICE_IMPACT_WARNING_THRESHOLD_PERCENT } from '../constants'

export function isHighPriceImpact(priceImpactPercent: number | null) {
  return (
    priceImpactPercent !== null &&
    priceImpactPercent > HIGH_PRICE_IMPACT_WARNING_THRESHOLD_PERCENT
  )
}
