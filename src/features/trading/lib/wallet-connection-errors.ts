const GENERIC_CONNECTION_ERRORS = [
  /^connection failed\.?$/i,
  /^unexpected error\.?$/i,
  /^wallet connection failed\.?$/i,
]

function readErrorMessages(error: unknown): Array<string> {
  const messages: Array<string> = []
  let current = error

  for (let depth = 0; depth < 3 && current; depth += 1) {
    if (typeof current === 'string') {
      messages.push(current)
      break
    }

    if (typeof current !== 'object') break

    const message = Reflect.get(current, 'message')
    if (typeof message === 'string' && message.trim()) {
      messages.push(message.trim())
    }

    current = Reflect.get(current, 'cause')
  }

  return messages
}

export function formatWalletConnectionError(
  error: unknown,
  connectorName: string,
): string {
  const messages = readErrorMessages(error)
  const details = messages.join(' ')

  if (
    /user rejected|user denied|cancel(?:led|ed)|declined|4001/i.test(details)
  ) {
    return `The connection request was cancelled in ${connectorName}. Approve it when you try again.`
  }

  if (/already pending|request.*pending|request.*already open/i.test(details)) {
    return `A connection request is already open in ${connectorName}. Approve or cancel it, then try again.`
  }

  if (
    /no accounts?|account.*(?:missing|not found)|empty accounts?/i.test(details)
  ) {
    return `${connectorName} did not return an account. Unlock it, approve Mato, and try again.`
  }

  if (/not installed|not available|unsupported|not detected/i.test(details)) {
    return `${connectorName} is not available in this browser. Enable it, or on mobile open Mato inside ${connectorName}.`
  }

  const specificMessage = messages.find(
    (message) =>
      !GENERIC_CONNECTION_ERRORS.some((pattern) => pattern.test(message)),
  )
  if (specificMessage) return specificMessage

  return `Unlock ${connectorName}, approve Mato, and try again. On mobile, open Mato inside ${connectorName}.`
}
