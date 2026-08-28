import type { SignupData, SignupResult } from '@/sections/auth/actions/signup'
import { ApiError } from '@/lib/api'
import { randomId } from './random'

export function mockSignup(data: SignupData): Promise<SignupResult> {
  if (!/^\d{10}$/.test(data.phone)) {
    return Promise.reject(new ApiError('Phone number must be 10 digits', 400))
  }
  if (data.phone === '5500000000') {
    return Promise.reject(new ApiError('Phone number already registered', 409))
  }
  return Promise.resolve({
    message: 'Cuenta creada. Te enviamos un código de verificación por teléfono.',
    user: {
      _id: `user_${randomId()}`,
      email: data.email,
      status: 'pending-registration',
      type: 'user',
      created: new Date().toISOString(),
    },
  })
}
