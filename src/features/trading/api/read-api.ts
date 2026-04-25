const readApiBaseUrl = (import.meta.env.VITE_READ_API_URL ?? '').trim()

function normalizedBaseUrl() {
  if (!readApiBaseUrl) {
    throw new Error('VITE_READ_API_URL is not configured')
  }

  return readApiBaseUrl.endsWith('/')
    ? readApiBaseUrl.slice(0, -1)
    : readApiBaseUrl
}

export function readApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl()}${normalizedPath}`
}
