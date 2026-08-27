import { describe, expect, it } from 'vitest'
import { formatWalletConnectionError } from './wallet-connection-errors'

describe('formatWalletConnectionError', () => {
  it('explains a rejected wallet request', () => {
    expect(
      formatWalletConnectionError(
        new Error('User rejected the request'),
        'Phantom',
      ),
    ).toBe(
      'The connection request was cancelled in Phantom. Approve it when you try again.',
    )
  })

  it('reads a specific error from a generic wrapper cause', () => {
    expect(
      formatWalletConnectionError(
        new Error('Wallet connection failed', {
          cause: new Error('Connection request already pending'),
        }),
        'Phantom',
      ),
    ).toBe(
      'A connection request is already open in Phantom. Approve or cancel it, then try again.',
    )
  })

  it('preserves a specific wallet error', () => {
    expect(
      formatWalletConnectionError(new Error('Phantom is locked'), 'Phantom'),
    ).toBe('Phantom is locked')
  })

  it('replaces a generic error with actionable guidance', () => {
    expect(
      formatWalletConnectionError(new Error('Unexpected error'), 'Phantom'),
    ).toBe(
      'Unlock Phantom, approve Mato, and try again. On mobile, open Mato inside Phantom.',
    )
  })
})
