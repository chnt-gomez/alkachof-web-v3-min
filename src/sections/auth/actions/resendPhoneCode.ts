import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockResendPhoneCode } from '@/mocks'

export type ResendPhoneCodeRequest = {
  email: string
}

export type ResendPhoneCodeResult = {
  message: string
}

export async function resendPhoneCode(data: ResendPhoneCodeRequest): Promise<ResendPhoneCodeResult> {
  if (IS_DEV_STAGE) return mockResendPhoneCode(data)
  return api<ResendPhoneCodeResult>('/phone/resend', {
    method: 'POST',
    authenticated: false,
    body: data,
  })
}
