import { api } from '@/lib/api'

export type RecoveryRequest = {
  email: string
}

export type RecoveryResult = {
  message: string
}

export async function requestRecovery(data: RecoveryRequest): Promise<RecoveryResult> {
  return api<RecoveryResult>('/recover', {
    method: 'POST',
    authenticated: false,
    body: data,
  })
}
