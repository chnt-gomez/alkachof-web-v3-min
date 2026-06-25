import type { ResetPasswordRequest, ResetPasswordResult } from '@/sections/auth/actions/resetPassword'

export function mockResetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResult> {
  void data
  return Promise.resolve({
    message: 'Contraseña actualizada correctamente.',
  })
}
