import { api } from '@/lib/api'

export type ResetPasswordRequest = {
  email: string
  /** The 6-digit code the user typed. Field is named `token` server-side. */
  token: string
  password: string
}

export type ResetPasswordResult = {
  message: string
}

export async function resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResult> {
  return api<ResetPasswordResult>('/reset', {
    method: 'POST',
    authenticated: false,
    body: data,
  })
}
