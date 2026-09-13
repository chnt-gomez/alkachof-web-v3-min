import { api } from '@/lib/api'

export type VerifyPhoneRequest = {
  email: string
  /** Exactly 6 digits, leading zeros significant. Send as typed — never parse to a number. */
  code: string
}

export type VerifyPhoneResult = {
  message: string
}

export async function verifyPhone(data: VerifyPhoneRequest): Promise<VerifyPhoneResult> {
  return api<VerifyPhoneResult>('/phone/verify', {
    method: 'POST',
    authenticated: false,
    body: data,
  })
}
