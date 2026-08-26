const GENERIC_TRANSACTION_PLAN_MESSAGE =
  'The provided transaction plan failed to execute.'
const STALE_MARKET_ACCOUNTS_MESSAGE =
  'Market timing changed while the transaction was awaiting wallet approval. Please try again.'
const SOLANA_CUSTOM_INSTRUCTION_ERROR_CODE = 4_615_026
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

function hasStructuredCustomProgramError(error: unknown, code: number) {
  if (!isRecord(error)) return false

  const context = isRecord(error.context) ? error.context : null
  const outerCode = extractSolanaErrorCode(error)
  const programCode = readNumber(context?.code) ?? readNumber(error.code)

  return (
    outerCode === SOLANA_CUSTOM_INSTRUCTION_ERROR_CODE && programCode === code
  )
}

function serializeError(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function isStaleMarketAccountError(...values: Array<unknown>) {
  const detail = values
    .map((value) => (typeof value === 'string' ? value : serializeError(value)))
    .join(' ')

  return (
    values.some(
      (value) =>
        hasStructuredCustomProgramError(value, 6006) ||
        hasStructuredCustomProgramError(value, 6007) ||
        hasStructuredCustomProgramError(value, 6010),
    ) ||
    /"Custom"\s*:\s*(?:6006|6007|6010)/.test(detail) ||
    /custom program error:\s*0x(?:1776|1777|177a)/i.test(detail)
  )
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

export function formatTransactionError(error: unknown, fallback: string) {
  const transactionPlanResult = isRecord(error)
    ? (error.transactionPlanResult ??
      (isRecord(error.context) ? error.context.transactionPlanResult : null))
    : null

  const failedPlan = findFirstFailedPlanResult(transactionPlanResult)
  const nestedError = failedPlan?.error ?? unwrapCause(error)

  const knownSolanaMessage =
    extractKnownSolanaMessage(nestedError) ?? extractKnownSolanaMessage(error)
  if (knownSolanaMessage) return knownSolanaMessage

  const message =
    extractMessage(nestedError) ?? extractMessage(error) ?? fallback

  if (isStaleMarketAccountError(message, nestedError, error)) {
    return STALE_MARKET_ACCOUNTS_MESSAGE
  }

  const logs = extractLogs(nestedError) ?? extractLogs(error)
  if (!logs || logs.length === 0) {
    if (message !== fallback) return message
    const hint = extractPlanHint(transactionPlanResult)
    return hint ? `${fallback} Details: ${hint}` : message
  }

  const tail = logs.slice(-2).join(' | ')
  return `${message} Logs: ${tail}`
}
