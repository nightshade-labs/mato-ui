// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WalletConnectionButton } from './wallet-connection-button'

const mocks = vi.hoisted(() => ({
  clearFeedback: vi.fn(),
  useReclaimRent: vi.fn(),
}))

vi.mock('@solana/react-hooks', () => ({
  useWalletConnection: () => ({
    connect: vi.fn(),
    connected: false,
    connectors: [],
    currentConnector: null,
    disconnect: vi.fn(),
    isReady: true,
    status: 'disconnected',
    wallet: null,
  }),
}))

vi.mock('../hooks/use-reclaim-rent', () => ({
  useReclaimRent: mocks.useReclaimRent,
}))

vi.mock('../hooks/use-wallet-sol-balance', () => ({
  useWalletSolBalance: () => ({
    lamports: null,
    refresh: vi.fn(),
  }),
}))

beforeEach(() => {
  mocks.useReclaimRent.mockReturnValue({
    clearFeedback: mocks.clearFeedback,
    closeableCount: 0,
    error: null,
    isReclaiming: false,
    reclaimRent: vi.fn(),
    reclaimedLamports: 0n,
    reset: vi.fn(),
    signature: null,
    status: 'idle',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('WalletConnectionButton', () => {
  it('checks rent eligibility for the selected market', () => {
    const view = render(<WalletConnectionButton marketId={1} />)

    expect(mocks.useReclaimRent).toHaveBeenLastCalledWith(false, 1)

    view.rerender(<WalletConnectionButton marketId={4} />)

    expect(mocks.useReclaimRent).toHaveBeenLastCalledWith(false, 4)
  })
})
