import { ApiError } from './apiError'
import { clearTokens, getRefreshToken, getToken, getTokenExpiryMs, setTokens } from './auth'
import { resetAppCache } from './queryClient'

const PROACTIVE_REFRESH_BUFFER_MS = 30_000

/**
 * Deadlines. Nothing here had one, so a request that never answered held the
 * screen for however long the OS took to give up on the socket — minutes, on a
 * phone that walked out of coverage. `ProtectedRoute` blocks the whole tree on
 * the profile query, so that time is spent looking at a skeleton.
 *
 * Three values rather than one, because the three cases differ:
 *
 * - A refresh is serialized *in front of* the request it authorises, so the
 *   user waits it out and then waits again. It carries the shortest deadline.
 * - Uploads carry real bytes. `resizeImage` lands a phone photo around 150 KB,
 *   but a bad connection still needs room, and aborting a half-sent product
 *   photo is a worse failure than a slow one.
 */
const REFRESH_TIMEOUT_MS = 8_000
const REQUEST_TIMEOUT_MS = 15_000
const UPLOAD_TIMEOUT_MS = 60_000

/**
 * `fetch` with a deadline.
 *
 * A plain `AbortController` rather than `AbortSignal.timeout`: no caller passes
 * a signal of its own today, so there is nothing to merge, and this needs no
 * `AbortSignal.any` support on the phones this runs on.
 */
async function fetchWithDeadline(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * What a refresh attempt learned.
 *
 * The distinction that matters is `rejected` vs `unreachable`. Both used to be
 * `null`, and `null` ends the session — so a timeout or a dead tunnel logged the
 * user out and sent them to /login to type a password they did not need. Only
 * the server is allowed to say a session is over.
 */
type RefreshResult =
  | { status: 'ok'; token: string }
  | { status: 'rejected' }
  | { status: 'unreachable' }

/**
 * API origin, with any trailing slash removed.
 *
 * Every caller here joins with a path that already starts with `/`, so a var set
 * to `https://api.alkachof.mx/` (an easy thing to paste) produces
 * `https://api.alkachof.mx//catalog/…`. Most servers collapse the double slash,
 * which is exactly why this survives unnoticed — but path-based nginx `location`
 * rules do not match it, and it makes a mess of access logs. Normalising at the
 * definition covers the export's other two consumers as well: the Socket.IO host
 * in `liveSocket.ts` and the loopback rewrite in `mediaUrl.ts`.
 *
 * Trailing slashes only. Anything else about the value is the deployment's
 * business, not this module's.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'https://api.alkachof.mx').replace(/\/+$/, '')

/** API origin — also the Socket.IO host for the `/live` namespace. Never ends in `/`. */
export const API_BASE_URL = BASE_URL

export {
  ApiError,
  availableAtOf,
  isCodeDestroyedError,
  type ApiErrorBody,
} from './apiError'

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  authenticated?: boolean
}

/**
 * The refresh currently in flight, or null.
 *
 * Module scope, deliberately: the thing being guarded is the token pair in the
 * cookies, which is shared by everything in the tab, so the guard has to be too.
 *
 * Without it every caller refreshed for itself. A protected page fans out five
 * authenticated calls in one tick — profile, notifications, chat, catalog, news
 * — and on a warm reload the persisted profile means none of them has already
 * refreshed on the others' behalf. That was five POST /refresh for one expiry,
 * four of them spent learning what the fifth had already written.
 */
let inFlightRefresh: Promise<RefreshResult> | null = null

async function requestRefresh(): Promise<RefreshResult> {
  const refreshToken = getRefreshToken()
  // Nothing to exchange: this really is the end of the session.
  if (!refreshToken) return { status: 'rejected' }
  let res: Response
  try {
    res = await fetchWithDeadline(
      `${BASE_URL}/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      },
      REFRESH_TIMEOUT_MS,
    )
  } catch {
    // Aborted, offline, DNS, TLS. We never got an answer, so we learned nothing
    // about the token.
    return { status: 'unreachable' }
  }
  // 5xx is the server failing, not the token being refused.
  if (res.status >= 500) return { status: 'unreachable' }
  if (!res.ok) return { status: 'rejected' }
  try {
    const data = (await res.json()) as { token: string; refreshToken: string }
    setTokens(data.token, data.refreshToken)
    return { status: 'ok', token: data.token }
  } catch {
    // A 200 we could not read, or a cookie that would not stick
    // (`CookieWriteError`). Either way there is no usable new token.
    return { status: 'unreachable' }
  }
}

/**
 * Exchange the refresh token for a new pair, joining a refresh already running.
 *
 * Cleared on settle rather than kept: this dedupes *one expiry*, and the next
 * one an hour later must reach the server again rather than replay this answer.
 */
function sharedRefresh(): Promise<RefreshResult> {
  if (inFlightRefresh) return inFlightRefresh
  inFlightRefresh = requestRefresh().finally(() => {
    inFlightRefresh = null
  })
  return inFlightRefresh
}

/**
 * The token, or null if the refresh did not produce one. `liveSocket.ts` reads
 * it this way: it only needs something to hand the next handshake, and it
 * already stops retrying on a null.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const result = await sharedRefresh()
  return result.status === 'ok' ? result.token : null
}

/**
 * Test-only. Vitest isolates per *file*, not per test, so without this one
 * test's in-flight promise would satisfy the next one's refresh.
 */
export function __resetRefreshState(): void {
  inFlightRefresh = null
}

async function readError(res: Response): Promise<{ message: string; body: unknown }> {
  try {
    const data = await res.json()
    return { message: data?.error?.message ?? data?.message ?? `HTTP ${res.status}`, body: data }
  } catch {
    return { message: `HTTP ${res.status}`, body: undefined }
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { authenticated = true, body, headers, ...rest } = options
  const isFormData = body instanceof FormData

  const buildHeaders = (token: string | null): HeadersInit => {
    const h: Record<string, string> = { ...(headers as Record<string, string>) }
    if (body !== undefined && !isFormData) h['Content-Type'] = 'application/json'
    if (authenticated && token) h.Authorization = `Bearer ${token}`
    return h
  }

  const send = (token: string | null): Promise<Response> =>
    fetchWithDeadline(
      `${BASE_URL}${path}`,
      {
        ...rest,
        headers: buildHeaders(token),
        body:
          body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
      },
      isFormData ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS,
    )

  let token = getToken()
  /**
   * Whether a refresh in this call already failed to reach the server. One
   * `api()` call has two refresh points — the proactive one below and the 401
   * handler — and without this an unreachable server is waited out twice, so a
   * hung /refresh cost two deadlines back to back rather than one.
   */
  let refreshUnreachable = false
  if (authenticated && token) {
    const expiry = getTokenExpiryMs(token)
    if (expiry !== null && expiry - Date.now() < PROACTIVE_REFRESH_BUFFER_MS) {
      const refreshed = await sharedRefresh()
      // An unreachable server is not a reason to drop the token we hold: the
      // buffer means it may still have seconds of life, and the request below is
      // the thing that finds out.
      if (refreshed.status === 'ok') token = refreshed.token
      else if (refreshed.status === 'unreachable') refreshUnreachable = true
    }
  }

  let res = await send(token)

  if (res.status === 401 && authenticated) {
    // Deduping only covers callers that overlap at the moment of refresh. This
    // request may instead have been *in flight* while another one refreshed, in
    // which case it just 401'd on a token that is already superseded — and the
    // shared promise has settled, so asking again would rotate the pair a second
    // time for the same expiry. If the cookie moved under us, retry on what is
    // there now.
    const current = getToken()
    if (current && current !== token) {
      res = await send(current)
    } else if (refreshUnreachable) {
      // Already established, this call, that /refresh does not answer. Asking
      // again only spends a second deadline to learn the same thing.
      throw new ApiError('No pudimos contactar al servidor', 0)
    } else {
      const refreshed = await sharedRefresh()
      if (refreshed.status === 'rejected') {
        clearTokens()
        // The session is over, and the cached rows belong to it — see
        // `resetAppCache`. This is the other end of `logout`.
        resetAppCache()
        throw new ApiError('Sesión expirada', 401)
      }
      if (refreshed.status === 'unreachable') {
        // We could not ask, so we do not know the session ended — and guessing
        // wrong here is a logout the user did not earn. Fail this one request
        // and leave the tokens alone.
        throw new ApiError('No pudimos contactar al servidor', 0)
      }
      res = await send(refreshed.token)
    }
  }

  if (!res.ok) {
    const { message, body } = await readError(res)
    throw new ApiError(message, res.status, body)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
