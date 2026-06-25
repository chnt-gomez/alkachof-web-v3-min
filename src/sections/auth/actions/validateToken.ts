import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockValidateToken } from '@/mocks'

export type ValidateTokenResult = {
  valid: boolean
  email?: string
}

export async function validateToken(token: string): Promise<ValidateTokenResult> {
  if (IS_DEV_STAGE) return mockValidateToken(token)
  return api<ValidateTokenResult>(`/validate/${encodeURIComponent(token)}`, {
    method: 'GET',
    authenticated: false,
  })
}
