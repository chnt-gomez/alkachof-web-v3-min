import type { RecoveryRequest, RecoveryResult } from '@/sections/auth/actions/requestRecovery'

export function mockRequestRecovery(data: RecoveryRequest): Promise<RecoveryResult> {
  void data
  return Promise.resolve({
    message: 'Si el correo está registrado, recibirás un código por mensaje de texto para restablecer tu contraseña.',
  })
}
