import type { VerifyPhoneRequest, VerifyPhoneResult } from '@/sections/auth/actions/verifyPhone'
import { ApiError } from '@/lib/api'

export function mockVerifyPhone(data: VerifyPhoneRequest): Promise<VerifyPhoneResult> {
  if (data.code.startsWith('invalid')) {
    return Promise.reject(new ApiError('Invalid token', 400))
  }
  return Promise.resolve({ message: 'Phone verified' })
}
