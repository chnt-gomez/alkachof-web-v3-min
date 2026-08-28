import type {
  ResendPhoneCodeRequest,
  ResendPhoneCodeResult,
} from '@/sections/auth/actions/resendPhoneCode'

export function mockResendPhoneCode(data: ResendPhoneCodeRequest): Promise<ResendPhoneCodeResult> {
  void data
  return Promise.resolve({ message: 'Verification code sent' })
}
