import { api } from '@/lib/api'

export type ResendPhoneCodeRequest = {
  email: string
}

export type ResendPhoneCodeResult = {
  message: string
}

export async function resendPhoneCode(data: ResendPhoneCodeRequest): Promise<ResendPhoneCodeResult> {
  return api<ResendPhoneCodeResult>('/phone/resend', {
    method: 'POST',
    authenticated: false,
    body: data,
  })
}
