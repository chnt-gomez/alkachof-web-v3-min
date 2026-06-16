const TOKEN_KEY = 'alk.token'
const REFRESH_KEY = 'alk.refreshToken'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(token: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
