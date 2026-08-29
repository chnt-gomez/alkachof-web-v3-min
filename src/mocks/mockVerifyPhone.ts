import type { VerifyPhoneRequest, VerifyPhoneResult } from '@/sections/auth/actions/verifyPhone'
import { ApiError } from '@/lib/api'

export function mockVerifyPhone(data: VerifyPhoneRequest): Promise<VerifyPhoneResult> {
  if (data.code.startsWith('destroyed')) {
    return Promise.reject(
      new ApiError('Too many incorrect attempts. Request a new code.', 400, {
        message: 'Too many incorrect attempts. Request a new code.',
        codeDestroyed: true,
      })
    )
  }
  if (data.code.startsWith('invalid')) {
    return Promise.reject(new ApiError('Invalid token', 400))
  }
  return Promise.resolve({ message: 'Phone verified' })
}
