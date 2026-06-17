import type { LoginCredentials, LoginResult } from '@/sections/auth/actions/login'
import { ApiError } from '@/lib/api'
import { randomId } from './random'

export function mockLogin(credentials: LoginCredentials): Promise<LoginResult> {
  if (!credentials.email || !credentials.password) {
    return Promise.reject(new ApiError('Correo o contraseña inválidos', 400))
  }
  return Promise.resolve({
    token: `mock.token.${randomId()}`,
    refreshToken: `mock.refresh.${randomId()}`,
  })
}
