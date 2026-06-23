import { describe, expect, it } from 'vitest'
import { normalizeReadApiBaseUrl } from './read-api'

describe('normalizeReadApiBaseUrl', () => {
  it('keeps a fully qualified read api origin', () => {
    expect(
      normalizeReadApiBaseUrl(
        'https://read-api-production-f8ea.up.railway.app/',
      ),
    ).toBe('https://read-api-production-f8ea.up.railway.app')
  })

  it('adds https when the deployed env omits the protocol', () => {
    expect(
      normalizeReadApiBaseUrl('read-api-production-f8ea.up.railway.app'),
    ).toBe('https://read-api-production-f8ea.up.railway.app')
  })

  it('removes a duplicated version prefix from the base url', () => {
    expect(
      normalizeReadApiBaseUrl(
        'https://read-api-production-f8ea.up.railway.app/v1/',
      ),
    ).toBe('https://read-api-production-f8ea.up.railway.app')
  })
})
