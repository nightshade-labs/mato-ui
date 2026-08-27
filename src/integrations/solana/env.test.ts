import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getBrowserSolanaRpcEndpoint,
  getBrowserSolanaWebsocketEndpoint,
} from './env'

describe('browser Solana environment', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the statically referenced Vite RPC endpoint', () => {
    vi.stubEnv('VITE_SOLANA_RPC_URL', ' https://rpc.example.com ')

    expect(getBrowserSolanaRpcEndpoint()).toBe('https://rpc.example.com')
  })

  it('uses the statically referenced Vite WebSocket endpoint', () => {
    vi.stubEnv('VITE_SOLANA_WS_URL', ' wss://rpc.example.com ')

    expect(
      getBrowserSolanaWebsocketEndpoint('https://fallback.example.com'),
    ).toBe('wss://rpc.example.com')
  })

  it('derives the WebSocket endpoint when none is configured', () => {
    vi.stubEnv('VITE_SOLANA_WS_URL', '')

    expect(getBrowserSolanaWebsocketEndpoint('https://rpc.example.com')).toBe(
      'wss://rpc.example.com',
    )
  })
})
