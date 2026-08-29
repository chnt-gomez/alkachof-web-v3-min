import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockVerifyPhone } from '@/mocks'

export type VerifyPhoneRequest = {
  email: string
  /** Exactly 6 digits, leading zeros significant. Send as typed — never parse to a number. */
  code: string
}

export type VerifyPhoneResult = {
  message: string
}

export async function verifyPhone(data: VerifyPhoneRequest): Promise<VerifyPhoneResult> {
  if (IS_DEV_STAGE) return mockVerifyPhone(data)
  return api<VerifyPhoneResult>('/phone/verify', {
    method: 'POST',
    authenticated: false,
    body: data,
  })
}
