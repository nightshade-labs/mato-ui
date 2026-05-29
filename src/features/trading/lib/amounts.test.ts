import { describe, expect, it } from 'vitest'
import {
  MAINTENANCE_TRANSACTION_FEE_BUFFER_ATOMS,
  NATIVE_FEE_BUFFER_ATOMS,
} from '../constants'
import {
  getSpendableNativeAtoms,
  isNativeBalanceBelowTransactionMinimum,
} from './amounts'

describe('native SOL transaction minimum', () => {
  it('does not warn before native balance has loaded', () => {
    expect(isNativeBalanceBelowTransactionMinimum(null)).toBe(false)
  })

  it('warns below the required fee and rent buffer', () => {
    expect(
      isNativeBalanceBelowTransactionMinimum(NATIVE_FEE_BUFFER_ATOMS - 1n),
    ).toBe(true)
  })

  it('allows the exact required fee and rent buffer', () => {
    expect(
      isNativeBalanceBelowTransactionMinimum(NATIVE_FEE_BUFFER_ATOMS),
    ).toBe(false)
  })

  it('accepts a lower minimum for maintenance transactions', () => {
    expect(
      isNativeBalanceBelowTransactionMinimum(
        MAINTENANCE_TRANSACTION_FEE_BUFFER_ATOMS - 1n,
        MAINTENANCE_TRANSACTION_FEE_BUFFER_ATOMS,
      ),
    ).toBe(true)
    expect(
      isNativeBalanceBelowTransactionMinimum(
        MAINTENANCE_TRANSACTION_FEE_BUFFER_ATOMS,
        MAINTENANCE_TRANSACTION_FEE_BUFFER_ATOMS,
      ),
    ).toBe(false)
  })
})

describe('getSpendableNativeAtoms', () => {
  it('keeps the native transaction buffer unavailable for order sizing', () => {
    expect(getSpendableNativeAtoms(NATIVE_FEE_BUFFER_ATOMS + 1n, 0n)).toBe(1n)
  })
})
