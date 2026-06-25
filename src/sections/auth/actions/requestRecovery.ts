import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockRequestRecovery } from '@/mocks'

export type RecoveryRequest = {
  email: string
}

export type RecoveryResult = {
  message: string
}

export async function requestRecovery(data: RecoveryRequest): Promise<RecoveryResult> {
  if (IS_DEV_STAGE) return mockRequestRecovery(data)
  return api<RecoveryResult>('/recover', {
    method: 'POST',
    authenticated: false,
    body: data,
  })
}
