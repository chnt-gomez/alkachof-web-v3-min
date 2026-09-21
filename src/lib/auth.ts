import { deleteCookie, readCookie, writeCookie } from './cookies'

const TOKEN_COOKIE = 'alk.token'
const REFRESH_COOKIE = 'alk.refreshToken'

/**
 * The cross-tab session signal, and the one thing auth still keeps in
 * `localStorage`.
 *
 * Cookies fire no event: writing `document.cookie` in one tab is invisible to
 * every other one, and the session listener in `AuthContext` depends on being
 * told. This key holds a random id — **not a credential**, meaningless to the
 * API — written and removed alongside the cookies purely so its removal fires a
 * `storage` event in the other tabs. `BroadcastChannel` would be the natural
 * fit; jsdom does not implement it, and the thing under test would become the
 * polyfill.
 *
 * Written and removed **only** by `setTokens`/`clearTokens`, so it cannot drift
 * out of step with the cookies.
 */
export const SESSION_MARKER_KEY = 'alk.session'

/**
 * How long a session survives on this device.
 *
 * This is the **refresh** token's lifetime, and both cookies carry it. The
 * tempting version — an access cookie expiring at the JWT's `exp` — breaks the
 * boot path: `AuthProvider` seeds `hasSession` from `Boolean(getToken())`, so
 * an evaporated access cookie beside a live refresh token boots the app as
 * logged out and nothing ever calls `/refresh`. The access token's real expiry
 * is its `exp` claim, enforced by the API and read here by `getTokenExpiryMs`
 * for the proactive refresh in `api.ts` — that machinery is untouched.
 *
 * 7 days is the API's refresh TTL, measured from a real `/login` response
 * (`exp - iat === 604800`). `/refresh` rotates the refresh token and `api.ts`
 * writes the pair back through `setTokens`, so an active session re-arms this
 * window on every refresh.
 */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function getToken(): string | null {
  return readCookie(TOKEN_COOKIE)
}

export function getRefreshToken(): string | null {
  return readCookie(REFRESH_COOKIE)
}

/**
 * @throws {CookieWriteError} when a cookie does not stick — see `writeCookie`.
 * A silent failure here would look like a successful login followed by an
 * unexplainable logout on the first authenticated request.
 */
export function setTokens(token: string, refreshToken: string): void {
  writeCookie(TOKEN_COOKIE, token, SESSION_MAX_AGE_SECONDS)
  writeCookie(REFRESH_COOKIE, refreshToken, SESSION_MAX_AGE_SECONDS)
  writeSessionMarker()
}

export function clearTokens(): void {
  deleteCookie(TOKEN_COOKIE)
  deleteCookie(REFRESH_COOKIE)
  try {
    localStorage.removeItem(SESSION_MARKER_KEY)
  } catch {
    // Safari private mode throws on `localStorage`; the cookies are already
    // gone, which is the part that ends the session.
  }
}

export function getTokenExpiryMs(token: string): number | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const decoded = JSON.parse(atob(padded)) as { exp?: number }
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * A random id rather than `'1'`, so that "another tab logged in as someone
 * else" stays distinguishable if it is ever needed. Today only its removal is
 * read.
 */
function writeSessionMarker(): void {
  try {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Math.random()).slice(2)
    localStorage.setItem(SESSION_MARKER_KEY, id)
  } catch {
    // Storage unavailable (Safari private mode, quota). The session is valid —
    // the tokens are in cookies — only the cross-tab signal is lost.
  }
}

/**
 * One-shot migration off `localStorage`.
 *
 * Without it, the deploy that ships cookies logs out every seller currently
 * signed in — a mystery logout is a support message, and this is six lines.
 *
 * TODO: delete this (and its test) one release after the cookie storage ships.
 */
function migrateLegacyTokens(): void {
  try {
    const token = localStorage.getItem(TOKEN_COOKIE)
    const refreshToken = localStorage.getItem(REFRESH_COOKIE)
    if (token) setTokens(token, refreshToken ?? '')
    localStorage.removeItem(TOKEN_COOKIE)
    localStorage.removeItem(REFRESH_COOKIE)
  } catch {
    // Nothing to migrate is the common case, and a failed migration must never
    // take the app's boot path with it.
  }
}

migrateLegacyTokens()
