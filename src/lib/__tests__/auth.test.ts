import { describe, it, expect } from 'vitest'
import { getTokenExpiryMs } from '../auth'

function makeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

describe('getTokenExpiryMs', () => {
  it('returns exp in milliseconds when payload has exp', () => {
    const expSeconds = 1_700_000_000
    expect(getTokenExpiryMs(makeJwt({ exp: expSeconds }))).toBe(expSeconds * 1000)
  })

  it('returns null for a token without exp', () => {
    expect(getTokenExpiryMs(makeJwt({ sub: 'x' }))).toBeNull()
  })

  it('returns null for malformed tokens', () => {
    expect(getTokenExpiryMs('not-a-jwt')).toBeNull()
    expect(getTokenExpiryMs('a.b')).toBeNull()
  })
})
