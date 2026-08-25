import { describe, expect, it } from 'vitest'
import { formatTransactionError } from './transaction-errors'

describe('formatTransactionError', () => {
  it('prefers the nested failed transaction error over the generic planner error', () => {
    const error = {
      context: {
        transactionPlanResult: {
          kind: 'single',
          status: 'failed',
          error: {
            context: {
              logs: ['Program log: one', 'Program log: two'],
            },
            message: 'custom program error: 0x1',
          },
        },
      },
      message: 'The provided transaction plan failed to execute.',
    }

    expect(formatTransactionError(error, 'fallback')).toBe(
      'custom program error: 0x1 Logs: Program log: one | Program log: two',
    )
  })

  it('uses the direct error message when the error is already specific', () => {
    expect(
      formatTransactionError(new Error('Insufficient funds'), 'fallback'),
    ).toBe('Insufficient funds')
  })

  it('falls back when there is no readable detail', () => {
    expect(
      formatTransactionError(
        { message: 'The provided transaction plan failed to execute.' },
        'fallback',
      ),
    ).toBe('fallback')
  })

  it('adds a plan hint when the planner only returns structured metadata', () => {
    const error = {
      context: {
        transactionPlanResult: {
          kind: 'single',
          status: 'failed',
          error: {
            code: '1001',
            name: 'SimulationFailure',
            reason: 'Instruction 0 failed',
          },
        },
      },
      message: 'The provided transaction plan failed to execute.',
    }

    expect(formatTransactionError(error, 'fallback')).toBe(
      'fallback Details: SimulationFailure / 1001 / Instruction 0 failed',
    )
  })

  it('explains the insecure wallet browser error', () => {
    const error = {
      context: { __code: 3_610_000 },
      message:
        'Solana error #3610000: Decode this error by running `npx @solana/errors decode -- 3610000`',
    }

    expect(formatTransactionError(error, 'fallback')).toBe(
      'This wallet browser cannot securely prepare Solana transactions. Update the wallet app or open Mato in another wallet browser, then try again.',
    )
  })

  it('decodes the production Solana message inside a failed plan', () => {
    const error = {
      context: {
        transactionPlanResult: {
          kind: 'single',
          status: 'failed',
          error: {
            message:
              'Solana error #3610000: Decode this error by running `npx @solana/errors decode -- 3610000`',
          },
        },
      },
      message: 'The provided transaction plan failed to execute.',
    }

    expect(formatTransactionError(error, 'fallback')).toBe(
      'This wallet browser cannot securely prepare Solana transactions. Update the wallet app or open Mato in another wallet browser, then try again.',
    )
  })
})
