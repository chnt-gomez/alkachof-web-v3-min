import { clearTokens, getRefreshToken, getToken, getTokenExpiryMs, setTokens } from './auth'
import { resetAppCache } from './queryClient'

const PROACTIVE_REFRESH_BUFFER_MS = 30_000

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

export class ApiError extends Error {
  readonly status: number
  /** Parsed JSON response body, when the server returned one. */
  readonly body: unknown
  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

/** Envelope A — controller-rejected error body. Carries the codeDestroyed flag. */
export type ApiErrorBody = {
  message?: string
  /** Present and true only when a verification/reset code was destroyed by too many attempts. */
  codeDestroyed?: boolean
  /** Present only on a 429, from the rate limiter. ISO 8601. */
  availableAt?: string
  /** Envelope B — global error handler. */
  error?: { message?: string }
}

/**
 * The moment a 429 says the caller may try again, when the body carries one.
 *
 * Both the IP rate limiter and the per-seller Instagram cooldown answer with
 * this field, so a caller reads one shape rather than two — and since the wait
 * can be fifteen minutes or seven days, the date is what the UI must show. Null
 * when the server sent no date; say "más tarde" rather than inventing one.
 */
export function availableAtOf(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null
  const at = (err.body as ApiErrorBody | undefined)?.availableAt
  return typeof at === 'string' ? at : null
}

/** True only when the code was destroyed server-side after too many wrong attempts — key off this flag, never the message string. */
export function isCodeDestroyedError(err: unknown): boolean {
  return err instanceof ApiError && (err.body as ApiErrorBody | undefined)?.codeDestroyed === true
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  authenticated?: boolean
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  const res = await fetch(`${BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { token: string; refreshToken: string }
  setTokens(data.token, data.refreshToken)
  return data.token
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
    fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: buildHeaders(token),
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    })

  let token = getToken()
  if (authenticated && token) {
    const expiry = getTokenExpiryMs(token)
    if (expiry !== null && expiry - Date.now() < PROACTIVE_REFRESH_BUFFER_MS) {
      const refreshed = await refreshAccessToken()
      if (refreshed) token = refreshed
    }
  }

  let res = await send(token)

  if (res.status === 401 && authenticated) {
    const newToken = await refreshAccessToken()
    if (!newToken) {
      clearTokens()
      // The session is over, and the cached rows belong to it — see
      // `resetAppCache`. This is the other end of `logout`.
      resetAppCache()
      throw new ApiError('Sesión expirada', 401)
    }
    res = await send(newToken)
  }

  if (!res.ok) {
    const { message, body } = await readError(res)
    throw new ApiError(message, res.status, body)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
