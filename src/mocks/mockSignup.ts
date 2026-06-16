import type { SignupData, SignupResult } from '@/sections/auth/actions/signup'
import { randomId } from './random'

export function mockSignup(data: SignupData): Promise<SignupResult> {
  return Promise.resolve({
    message: 'Cuenta creada. Revisa tu correo para activarla.',
    user: {
      _id: `user_${randomId()}`,
      email: data.email,
      status: 'pending-registration',
      type: 'user',
      created: new Date().toISOString(),
    },
  })
}
