const URL_PROTOCOL_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i

export function normalizeReadApiBaseUrl(rawBaseUrl: string) {
  const trimmedBaseUrl = rawBaseUrl.trim()

  if (!trimmedBaseUrl) {
    throw new Error('VITE_READ_API_URL is not configured')
  }

  const url = new URL(
    URL_PROTOCOL_PATTERN.test(trimmedBaseUrl)
      ? trimmedBaseUrl
      : `https://${trimmedBaseUrl.replace(/^\/\//, '')}`,
  )
  const pathname = url.pathname.replace(/\/+$/, '')
  url.pathname = pathname.endsWith('/v1') ? pathname.slice(0, -3) : pathname
  url.hash = ''

  return url.toString().replace(/\/$/, '')
}

function readApiBaseUrl() {
  return normalizeReadApiBaseUrl(import.meta.env.VITE_READ_API_URL ?? '')
}

export function readApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${readApiBaseUrl()}${normalizedPath}`
}
