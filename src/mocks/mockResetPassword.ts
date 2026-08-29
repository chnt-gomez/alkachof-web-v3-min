import type { ResetPasswordRequest, ResetPasswordResult } from '@/sections/auth/actions/resetPassword'
import { ApiError } from '@/lib/api'

export function mockResetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResult> {
  if (data.token.startsWith('destroyed')) {
    return Promise.reject(
      new ApiError('Too many incorrect attempts. Request a new code.', 400, {
        message: 'Too many incorrect attempts. Request a new code.',
        codeDestroyed: true,
      })
    )
  }
  if (data.token.startsWith('invalid')) {
    return Promise.reject(new ApiError('Invalid token', 400))
  }
  return Promise.resolve({
    message: 'Contraseña actualizada correctamente.',
  })
}
