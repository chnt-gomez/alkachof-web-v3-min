import type { RecoveryRequest, RecoveryResult } from '@/sections/auth/actions/requestRecovery'

export function mockRequestRecovery(data: RecoveryRequest): Promise<RecoveryResult> {
  void data
  return Promise.resolve({
    message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
  })
}
