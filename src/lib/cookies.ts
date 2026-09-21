/**
 * Cookie primitives — a leaf module with no knowledge of what it stores.
 *
 * `auth.ts` is the only caller today. Everything specific to tokens (names,
 * lifetime, the cross-tab marker) lives there; everything specific to the
 * *format* — the attribute string, encoding, the size cap — lives here.
 */

/**
 * Attributes every cookie this module writes carries.
 *
 * - `path=/` — the SPA reads its cookies from every route.
 * - `SameSite=Strict` — nothing here is ever *sent* anywhere that matters: the
 *   API is a different origin and auth rides an `Authorization` header. `Lax`
 *   would buy nothing, so take the tighter one.
 * - No `Domain`, so the cookie is host-only: `app.alkachof.mx` must not hand
 *   its tokens to a sibling subdomain.
 */
const BASE_ATTRIBUTES = 'path=/; SameSite=Strict'

/**
 * `Secure` is conditional and must stay conditional.
 *
 * A `Secure` cookie set over `http://localhost:5173` is discarded silently by
 * the browser, so hardcoding it would break `npm run dev` for everyone while
 * passing every test (jsdom runs on `http://localhost` with a lenient jar).
 */
function secureAttribute(): string {
  return typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
}

/**
 * Browsers cap a single cookie at ~4096 bytes of name + value + attributes, and
 * an oversized assignment is a **no-op that reports nothing**. Checked before
 * the write so the failure surfaces here rather than as an unauthenticated
 * request one screen later.
 */
const MAX_COOKIE_BYTES = 4096

export class CookieWriteError extends Error {}

/** The cookie's value, decoded, or null when it is not set. */
export function readCookie(name: string): string | null {
  // Matches `queryPersist.tsx`: this module is imported at boot and must not
  // assume a DOM.
  if (typeof document === 'undefined') return null
  for (const part of document.cookie.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() !== name) continue
    const raw = part.slice(eq + 1).trim()
    try {
      return decodeURIComponent(raw)
    } catch {
      // A value this module did not write, or one mangled by something else.
      return raw
    }
  }
  return null
}

/**
 * Writes a cookie and verifies it stuck.
 *
 * Both halves are load-bearing. The length check catches the documented 4 KB
 * cap; the read-back catches everything else a browser may silently refuse
 * (a per-origin total already spent, a `Secure` mismatch, cookies disabled).
 *
 * @throws {CookieWriteError} when the cookie is not readable after the write.
 */
export function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return
  const encoded = encodeURIComponent(value)
  const cookie = `${name}=${encoded}; Max-Age=${maxAgeSeconds}; ${BASE_ATTRIBUTES}${secureAttribute()}`
  if (cookie.length > MAX_COOKIE_BYTES) {
    throw new CookieWriteError(
      `Cookie "${name}" is ${cookie.length} bytes, over the ${MAX_COOKIE_BYTES}-byte limit`,
    )
  }
  document.cookie = cookie
  if (readCookie(name) !== value) {
    throw new CookieWriteError(`Cookie "${name}" was refused by the browser`)
  }
}

/**
 * Deletion is a write with `Max-Age=0` **and the identical `path`/`SameSite`**
 * — a mismatched path removes nothing and leaves the user logged in.
 */
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Max-Age=0; ${BASE_ATTRIBUTES}${secureAttribute()}`
}
