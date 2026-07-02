import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockLogin } from '@/mocks'

export type LoginCredentials = {
  email: string
  password: string
}

export type LoginResult = {
  token: string
  refreshToken: string
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  if (IS_DEV_STAGE) return mockLogin(credentials)
  const data = await api<{ token: string; refreshToken: string }>('/login', {
    method: 'POST',
    authenticated: false,
    body: credentials,
  })
  return { token: data.token, refreshToken: data.refreshToken }
}
