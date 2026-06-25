import type { ValidateTokenResult } from '@/sections/auth/actions/validateToken'
import { ApiError } from '@/lib/api'

export function mockValidateToken(token: string): Promise<ValidateTokenResult> {
  if (token.startsWith('invalid')) {
    return Promise.reject(new ApiError('Token inválido o expirado', 400))
  }
  return Promise.resolve({ valid: true, email: 'usuario@ejemplo.com' })
}
