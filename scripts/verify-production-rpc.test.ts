import { describe, expect, it } from 'vitest'
import { validateProductionSolanaEndpoints } from './verify-production-rpc'

describe('validateProductionSolanaEndpoints', () => {
  it('accepts direct Helius mainnet endpoints', () => {
    expect(
      validateProductionSolanaEndpoints(
        'https://mainnet.helius-rpc.com/?api-key=test-key',
        'wss://mainnet.helius-rpc.com/?api-key=test-key',
      ),
    ).toMatchObject({
      rpcUrl: { hostname: 'mainnet.helius-rpc.com' },
      websocketUrl: { hostname: 'mainnet.helius-rpc.com' },
    })
  })

  it('accepts a masked Helius Secure RPC endpoint', () => {
    expect(() =>
      validateProductionSolanaEndpoints(
        'https://project-fast-mainnet.helius-rpc.com',
        'wss://mainnet.helius-rpc.com/?api-key=test-key',
      ),
    ).not.toThrow()
  })

  it('rejects devnet endpoints', () => {
    expect(() =>
      validateProductionSolanaEndpoints(
        'https://devnet.helius-rpc.com/?api-key=test-key',
        'wss://devnet.helius-rpc.com/?api-key=test-key',
      ),
    ).toThrow('must point to a mainnet endpoint')
  })

  it('rejects the public Solana RPC', () => {
    expect(() =>
      validateProductionSolanaEndpoints(
        'https://api.mainnet.solana.com',
        'wss://api.mainnet.solana.com',
      ),
    ).toThrow('must use a dedicated provider endpoint')
  })
})
