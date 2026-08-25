import { isRpcRateLimitError } from '@/integrations/solana/rpc'

const GENERIC_TRANSACTION_PLAN_MESSAGE =
  'The provided transaction plan failed to execute.'
const STALE_MARKET_ACCOUNTS_MESSAGE =
  'Market state changed while the transaction was awaiting approval. Please try again.'
const RPC_RATE_LIMIT_MESSAGE =
  'The Solana RPC is temporarily rate-limited. Please wait a few seconds and try again.'
const SOLANA_SECURE_CONTEXT_ERROR_CODE = 3_610_000
const SOLANA_BROWSER_CRYPTO_ERROR_CODES = new Set([
  3_610_001, 3_610_002, 3_610_003, 3_610_004, 3_610_005, 3_610_006, 3_611_000,
])
const SECURE_CONTEXT_MESSAGE =
  'This wallet browser cannot securely prepare Solana transactions. Update the wallet app or open Mato in another wallet browser, then try again.'
const BROWSER_CRYPTO_MESSAGE =
  'This wallet browser is missing cryptography required for Solana transactions. Update the wallet app or open Mato in another wallet browser, then try again.'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null
}

function extractSolanaErrorCode(error: unknown): number | null {
  if (!isRecord(error)) {
    const message = readString(error)
    const match = message?.match(/Solana error #(\d+)/i)
    return match?.[1] ? Number(match[1]) : null
  }

  const context = isRecord(error.context) ? error.context : null
  const structuredCode =
    readNumber(context?.__code) ??
    readNumber(error.__code) ??
    readNumber(error.code)
  if (structuredCode !== null) return structuredCode

  const message = readString(error.message)
  const match = message?.match(/Solana error #(\d+)/i)
  return match?.[1] ? Number(match[1]) : null
}

function extractKnownSolanaMessage(error: unknown): string | null {
  const code = extractSolanaErrorCode(error)
  if (code === SOLANA_SECURE_CONTEXT_ERROR_CODE) {
    return SECURE_CONTEXT_MESSAGE
  }
  if (code !== null && SOLANA_BROWSER_CRYPTO_ERROR_CODES.has(code)) {
    return BROWSER_CRYPTO_MESSAGE
  }
  return null
}

function readLogs(value: unknown) {
  if (!Array.isArray(value)) return null
  const logs = value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.length > 0,
  )
  return logs.length > 0 ? logs : null
}

function findFirstFailedPlanResult(value: unknown): UnknownRecord | null {
  if (!isRecord(value)) return null
  if (value.kind === 'single' && value.status === 'failed') return value

  const plans = value.plans
  if (!Array.isArray(plans)) return null

  for (const plan of plans) {
    const failed = findFirstFailedPlanResult(plan)
    if (failed) return failed
  }

  return null
}

function unwrapCause(error: unknown): unknown {
  if (!isRecord(error)) return null
  const context = isRecord(error.context) ? error.context : null
  return (
    context?.transactionPlanResult ??
    error.transactionPlanResult ??
    context?.cause ??
    error.cause ??
    error
  )
}

function extractMessage(error: unknown): string | null {
  if (!isRecord(error)) return readString(error)

  const context = isRecord(error.context) ? error.context : null
  const causeMessage = readString(context?.causeMessage)
  if (causeMessage) {
    return causeMessage.replace(/^\.\s*/, '').trim()
  }

  const errorMessage = readString(error.message)
  if (
    errorMessage &&
    !errorMessage.startsWith(GENERIC_TRANSACTION_PLAN_MESSAGE)
  ) {
    return errorMessage
  }

  return null
}

function extractLogs(error: unknown): Array<string> | null {
  if (!isRecord(error)) return null
  const context = isRecord(error.context) ? error.context : null
  return readLogs(context?.logs) ?? readLogs(error.logs)
}

function extractPlanHint(value: unknown): string | null {
  const failedPlan = findFirstFailedPlanResult(value)
  if (!failedPlan) return null

  const failedError = failedPlan.error
  const message = extractMessage(failedError)
  if (message) return message

  if (!isRecord(failedError)) return null

  const code = readString(failedError.code)
  const name = readString(failedError.name)
  const reason = readString(failedError.reason)
  const hint = [name, code, reason].filter(Boolean).join(' / ')
  return hint.length > 0 ? hint : null
}

function serializeError(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function serializeErrorDetails(values: Array<unknown>) {
  return values
    .map((value) => (typeof value === 'string' ? value : serializeError(value)))
    .join(' ')
}

function hasCustomProgramError(
  detail: string,
  code: number,
  hexCode: string,
  name: string,
) {
  return (
    new RegExp(`"Custom"\\s*:\\s*${code}`).test(detail) ||
    new RegExp(`custom program error:\\s*0x${hexCode}`, 'i').test(detail) ||
    new RegExp(name, 'i').test(detail)
  )
}

function isStaleMarketAccountError(...values: Array<unknown>) {
  const detail = serializeErrorDetails(values)

  return (
    hasCustomProgramError(detail, 6006, '1776', 'WrongExitsAccount') ||
    hasCustomProgramError(detail, 6007, '1777', 'WrongPricesAccount') ||
    hasCustomProgramError(detail, 6010, '177a', 'BookNotUpToDate')
  )
}

function getPositionControlErrorMessage(...values: Array<unknown>) {
  const detail = serializeErrorDetails(values)

  if (hasCustomProgramError(detail, 6031, '178f', 'AmountZero')) {
    return 'There are no new swapped funds to withdraw yet.'
  }
  if (hasCustomProgramError(detail, 6029, '178d', 'PositionIsPaused')) {
    return 'This position is already paused.'
  }
  if (hasCustomProgramError(detail, 6030, '178e', 'PositionIsNotPaused')) {
    return 'This position is not paused.'
  }

  return null
}

export function formatTransactionError(error: unknown, fallback: string) {
  const transactionPlanResult = isRecord(error)
    ? (error.transactionPlanResult ??
      (isRecord(error.context) ? error.context.transactionPlanResult : null))
    : null

  const failedPlan = findFirstFailedPlanResult(transactionPlanResult)
  const nestedError = failedPlan?.error ?? unwrapCause(error)

  if (isRpcRateLimitError(nestedError) || isRpcRateLimitError(error)) {
    return RPC_RATE_LIMIT_MESSAGE
  }

  const knownSolanaMessage =
    extractKnownSolanaMessage(nestedError) ?? extractKnownSolanaMessage(error)
  if (knownSolanaMessage) return knownSolanaMessage

  const message =
    extractMessage(nestedError) ?? extractMessage(error) ?? fallback

  if (isStaleMarketAccountError(message, nestedError, error)) {
    return STALE_MARKET_ACCOUNTS_MESSAGE
  }

  const positionControlMessage = getPositionControlErrorMessage(
    message,
    nestedError,
    error,
  )
  if (positionControlMessage) return positionControlMessage

  const logs = extractLogs(nestedError) ?? extractLogs(error)
  if (!logs || logs.length === 0) {
    if (message !== fallback) return message
    const hint = extractPlanHint(transactionPlanResult)
    return hint ? `${fallback} Details: ${hint}` : message
  }

  const tail = logs.slice(-2).join(' | ')
  return `${message} Logs: ${tail}`
}
