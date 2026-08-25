import {
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
  createDefaultRpcTransport,
  createSolanaRpcFromTransport,
  isSolanaError,
} from '@solana/kit'
import type { RpcTransport, SolanaError } from '@solana/kit'

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_DELAY_MS = 250
const MAX_RETRY_DELAY_MS = 2_000

type RetryOptions = {
  baseDelayMs?: number
  maxRetries?: number
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>
}

type RpcHttpError = SolanaError<
  typeof SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR
>

export function isRpcRateLimitError(error: unknown): error is RpcHttpError {
  return (
    isSolanaError(error, SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR) &&
    error.context.statusCode === 429
  )
}

function getRetryAfterMs(error: unknown) {
  if (!isRpcRateLimitError(error)) return null

  const retryAfter = error.context.headers.get('retry-after')?.trim()
  if (!retryAfter) return null

  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000

  const retryAt = Date.parse(retryAfter)
  if (Number.isNaN(retryAt)) return null

  return Math.max(0, retryAt - Date.now())
}

function waitForRetry(delayMs: number, signal?: AbortSignal) {
  if (!signal) {
    return new Promise<void>((resolve) => setTimeout(resolve, delayMs))
  }
  if (signal.aborted) {
    return Promise.reject(
      signal.reason ?? new DOMException('The request was aborted.', 'AbortError'),
    )
  }

  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout)
      reject(
        signal.reason ??
          new DOMException('The request was aborted.', 'AbortError'),
      )
    }
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export function getRpcTransportWithRateLimitRetry<TTransport extends RpcTransport>(
  transport: TTransport,
  options: RetryOptions = {},
): TTransport {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_RETRY_DELAY_MS
  const sleep = options.sleep ?? waitForRetry

  return (async function rateLimitRetryTransport<TResponse>(
    request: Parameters<RpcTransport>[0],
  ) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await transport<TResponse>(request)
      } catch (error) {
        if (!isRpcRateLimitError(error) || attempt >= maxRetries) throw error

        const retryAfterMs = getRetryAfterMs(error)
        const exponentialDelayMs = baseDelayMs * 2 ** attempt
        const delayMs = Math.min(
          retryAfterMs ?? exponentialDelayMs,
          MAX_RETRY_DELAY_MS,
        )
        await sleep(delayMs, request.signal)
      }
    }
  }) as TTransport
}

export function createSolanaRpcWithRateLimitRetry(endpoint: string) {
  const transport = createDefaultRpcTransport({ url: endpoint })
  return createSolanaRpcFromTransport(
    getRpcTransportWithRateLimitRetry(transport),
  )
}
