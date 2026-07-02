import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockResetPassword } from '@/mocks'

export type ResetPasswordRequest = {
  token: string
  password: string
}

export type ResetPasswordResult = {
  message: string
}

export async function resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResult> {
  if (IS_DEV_STAGE) return mockResetPassword(data)
  return api<ResetPasswordResult>('/reset', {
    method: 'POST',
    authenticated: false,
    body: data,
  })
}
