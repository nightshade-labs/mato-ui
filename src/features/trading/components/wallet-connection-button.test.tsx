// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WalletConnectionButton } from './wallet-connection-button'

const mocks = vi.hoisted(() => ({
  clearFeedback: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  reclaimRent: vi.fn(),
  refreshBalance: vi.fn(),
  reset: vi.fn(),
  toastError: vi.fn(),
  useWalletConnection: vi.fn(),
}))

vi.mock('@solana/react-hooks', () => ({
  useWalletConnection: mocks.useWalletConnection,
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('../hooks/use-reclaim-rent', () => ({
  useReclaimRent: () => ({
    clearFeedback: mocks.clearFeedback,
    closeableCount: 0,
    error: null,
    isReclaiming: false,
    reclaimRent: mocks.reclaimRent,
    reclaimedLamports: 0n,
    reset: mocks.reset,
    signature: null,
    status: 'idle',
  }),
}))

vi.mock('../hooks/use-wallet-sol-balance', () => ({
  useWalletSolBalance: () => ({
    lamports: 1_000_000n,
    refresh: mocks.refreshBalance,
  }),
}))

describe('WalletConnectionButton', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useWalletConnection.mockReturnValue({
      connect: mocks.connect,
      connected: false,
      connectors: [
        {
          id: 'wallet-standard:phantom',
          name: 'Phantom',
        },
      ],
      currentConnector: undefined,
      disconnect: mocks.disconnect,
      isReady: true,
      status: 'disconnected',
      wallet: undefined,
    })
  })

  it('uses an interactive request when the user selects Phantom', async () => {
    mocks.connect.mockResolvedValue({})

    render(<WalletConnectionButton />)
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }))
    fireEvent.click(screen.getByRole('button', { name: /phantom/i }))

    await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1))
    expect(mocks.connect.mock.calls[0]).toEqual(['wallet-standard:phantom'])
  })

  it('shows an actionable Phantom error and handles the rejection', async () => {
    mocks.connect.mockRejectedValue(new Error('Unexpected error'))

    render(<WalletConnectionButton />)
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }))
    fireEvent.click(screen.getByRole('button', { name: /phantom/i }))

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        'Could not connect to Phantom',
        expect.objectContaining({
          description:
            'Unlock Phantom, approve Mato, and try again. On mobile, open Mato inside Phantom.',
        }),
      ),
    )
    expect(screen.getByText('Wallet Standard')).toBeTruthy()
  })
})
