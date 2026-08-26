import { describe, expect, it } from 'vitest'
import { getApprovalSafeReferenceIndex } from './twob-client'

describe('getApprovalSafeReferenceIndex', () => {
  const endSlotInterval = 7n

  it('uses the next account when bookkeeping is current', () => {
    expect(
      getApprovalSafeReferenceIndex(441_834_516, 441_834_489n, endSlotInterval),
    ).toBe(6_311_922n)
  })

  it('keeps the current account when bookkeeping is still in the previous window', () => {
    expect(
      getApprovalSafeReferenceIndex(441_834_516, 441_834_439n, endSlotInterval),
    ).toBe(6_311_921n)
  })

  it('advances at the account boundary', () => {
    expect(
      getApprovalSafeReferenceIndex(441_834_540, 441_834_540n, endSlotInterval),
    ).toBe(6_311_923n)
  })
})
