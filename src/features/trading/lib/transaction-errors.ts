const GENERIC_TRANSACTION_PLAN_MESSAGE =
  'The provided transaction plan failed to execute.'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
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
  if (errorMessage && errorMessage !== GENERIC_TRANSACTION_PLAN_MESSAGE) {
    return errorMessage
  }

  return null
}

function extractLogs(error: unknown): string[] | null {
  if (!isRecord(error)) return null
  const context = isRecord(error.context) ? error.context : null
  return readLogs(context?.logs) ?? readLogs(error.logs)
}

export function formatTransactionError(error: unknown, fallback: string) {
  const transactionPlanResult = isRecord(error)
    ? (error.transactionPlanResult ??
      (isRecord(error.context) ? error.context.transactionPlanResult : null))
    : null

  const failedPlan = findFirstFailedPlanResult(transactionPlanResult)
  const nestedError = failedPlan?.error ?? unwrapCause(error)

  const message =
    extractMessage(nestedError) ?? extractMessage(error) ?? fallback

  const logs = extractLogs(nestedError) ?? extractLogs(error)
  if (!logs || logs.length === 0) return message

  const tail = logs.slice(-2).join(' | ')
  return `${message} Logs: ${tail}`
}
