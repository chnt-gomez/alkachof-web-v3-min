import { clearTokens, getRefreshToken, getToken, getTokenExpiryMs, setTokens } from './auth'

const PROACTIVE_REFRESH_BUFFER_MS = 30_000

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  authenticated?: boolean
}

async function refreshAccessToken(): Promise<string | null> {
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

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return data?.error?.message ?? data?.message ?? `HTTP ${res.status}`
  } catch {
    return `HTTP ${res.status}`
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
      throw new ApiError('Sesión expirada', 401)
    }
    res = await send(newToken)
  }

  if (!res.ok) throw new ApiError(await readError(res), res.status)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
