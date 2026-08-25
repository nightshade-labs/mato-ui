import { describe, expect, it, vi } from 'vitest'
import {
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
  SolanaError,
} from '@solana/kit'
import {
  getRpcTransportWithRateLimitRetry,
  isRpcRateLimitError,
} from './rpc'
import type { RpcTransport } from '@solana/kit'

function createHttpError(statusCode: number, retryAfter?: string) {
  return new SolanaError(SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR, {
    headers: new Headers(
      retryAfter ? { 'retry-after': retryAfter } : undefined,
    ),
    message: '',
    statusCode,
  })
}

describe('RPC rate-limit retry', () => {
  it('recognizes only HTTP 429 transport errors', () => {
    expect(isRpcRateLimitError(createHttpError(429))).toBe(true)
    expect(isRpcRateLimitError(createHttpError(503))).toBe(false)
    expect(isRpcRateLimitError(new Error('429'))).toBe(false)
  })

  it('retries rate-limited requests with exponential backoff', async () => {
    const response = { id: 1, jsonrpc: '2.0', result: 123 }
    const transport = vi
      .fn()
      .mockRejectedValueOnce(createHttpError(429))
      .mockRejectedValueOnce(createHttpError(429))
      .mockResolvedValue(response)
    const sleep = vi.fn(async () => {})
    const retryingTransport = getRpcTransportWithRateLimitRetry(
      transport as RpcTransport,
      { baseDelayMs: 100, sleep },
    )

    await expect(
      retryingTransport({
        payload: { id: 1, jsonrpc: '2.0', method: 'getSlot', params: [] },
      }),
    ).resolves.toBe(response)
    expect(transport).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenNthCalledWith(1, 100, undefined)
    expect(sleep).toHaveBeenNthCalledWith(2, 200, undefined)
  })

  it('honors Retry-After and stops after the retry limit', async () => {
    const error = createHttpError(429, '1')
    const transport = vi.fn().mockRejectedValue(error)
    const sleep = vi.fn(async () => {})
    const retryingTransport = getRpcTransportWithRateLimitRetry(
      transport as RpcTransport,
      { maxRetries: 2, sleep },
    )

    await expect(
      retryingTransport({
        payload: { id: 1, jsonrpc: '2.0', method: 'getSlot', params: [] },
      }),
    ).rejects.toBe(error)
    expect(transport).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenNthCalledWith(1, 1_000, undefined)
  })

  it('does not retry other HTTP failures', async () => {
    const error = createHttpError(503)
    const transport = vi.fn().mockRejectedValue(error)
    const sleep = vi.fn(async () => {})
    const retryingTransport = getRpcTransportWithRateLimitRetry(
      transport as RpcTransport,
      { sleep },
    )

    await expect(
      retryingTransport({
        payload: { id: 1, jsonrpc: '2.0', method: 'getSlot', params: [] },
      }),
    ).rejects.toBe(error)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })
})
