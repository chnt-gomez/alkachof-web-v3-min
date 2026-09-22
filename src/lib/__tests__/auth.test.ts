import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearTokens,
  getRefreshToken,
  getToken,
  getTokenExpiryMs,
  setTokens,
  SESSION_MARKER_KEY,
} from '../auth'

function makeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

/** The attribute string the browser was actually handed, for the assertions no read-back can make. */
function captureWrites(): string[] {
  const written: string[] = []
  vi.spyOn(document, 'cookie', 'set').mockImplementation((value: string) => {
    written.push(value)
    // Keep the jar in step so `writeCookie`'s read-back still sees the value.
    Reflect.set(Document.prototype, 'cookie', value, document)
  })
  return written
}

beforeEach(() => {
  clearTokens()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('token storage', () => {
  it('round-trips both tokens', () => {
    setTokens('access-abc', 'refresh-xyz')
    expect(getToken()).toBe('access-abc')
    expect(getRefreshToken()).toBe('refresh-xyz')
  })

  it('writes no JWT to localStorage', () => {
    setTokens('access-abc', 'refresh-xyz')
    const stored = Object.keys(localStorage).map((k) => `${k}=${localStorage.getItem(k)}`).join('|')
    expect(stored).not.toContain('access-abc')
    expect(stored).not.toContain('refresh-xyz')
  })

  it('clears both tokens and the cross-tab marker', () => {
    setTokens('access-abc', 'refresh-xyz')
    expect(localStorage.getItem(SESSION_MARKER_KEY)).not.toBeNull()

    clearTokens()

    expect(getToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    // Its removal is what fires `storage` in the other tabs — see AuthContext.
    expect(localStorage.getItem(SESSION_MARKER_KEY)).toBeNull()
  })

  it('survives a value needing percent-encoding', () => {
    const awkward = 'a b;c=d,e"f'
    setTokens(awkward, 'refresh-xyz')
    expect(getToken()).toBe(awkward)
  })

  // R1: an oversized `document.cookie` assignment is a no-op that reports
  // nothing — login would appear to succeed and the next request go out
  // unauthenticated.
  it('throws rather than silently dropping an oversized token', () => {
    expect(() => setTokens('x'.repeat(5000), 'refresh-xyz')).toThrow(/limit/)
  })

  // R6: hardcoding `Secure` passes every test and breaks `npm run dev`, where
  // the browser discards a `Secure` cookie set over http://localhost. The
  // other half of this pair — that https *does* get it — is
  // `authSecureCookie.test.ts`, which needs its own https document.
  it('omits Secure over http', () => {
    const written = captureWrites()
    expect(location.protocol).toBe('http:')
    setTokens('access-abc', 'refresh-xyz')
    expect(written).not.toHaveLength(0)
    expect(written.every((cookie) => !cookie.includes('Secure'))).toBe(true)
  })

  it('scopes every write to path=/ and SameSite=Strict', () => {
    const written = captureWrites()
    setTokens('access-abc', 'refresh-xyz')
    clearTokens()
    expect(written).not.toHaveLength(0)
    for (const cookie of written) {
      expect(cookie).toContain('path=/')
      expect(cookie).toContain('SameSite=Strict')
      // Host-only: app.alkachof.mx must not hand tokens to a sibling subdomain.
      expect(cookie).not.toContain('Domain')
    }
  })

  it('deletes with Max-Age=0', () => {
    setTokens('access-abc', 'refresh-xyz')
    const written = captureWrites()
    clearTokens()
    expect(written.filter((c) => c.includes('Max-Age=0'))).toHaveLength(2)
  })
})

// D6 — delete with the migration itself, one release after cookie storage ships.
describe('the one-shot migration off localStorage', () => {
  it('moves legacy tokens into cookies and empties the old keys', async () => {
    clearTokens()
    localStorage.setItem('alk.token', 'legacy-access')
    localStorage.setItem('alk.refreshToken', 'legacy-refresh')

    // Module scope is where the migration runs, so re-import it fresh.
    vi.resetModules()
    const auth = await import('../auth')

    expect(auth.getToken()).toBe('legacy-access')
    expect(auth.getRefreshToken()).toBe('legacy-refresh')
    expect(localStorage.getItem('alk.token')).toBeNull()
    expect(localStorage.getItem('alk.refreshToken')).toBeNull()
  })

  it('leaves a browser with no legacy tokens alone', async () => {
    clearTokens()
    vi.resetModules()
    const auth = await import('../auth')
    expect(auth.getToken()).toBeNull()
  })
})

// Unchanged by the move to cookies: this parses a JWT and never knew where it
// was stored.
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
