import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockSignup } from '@/mocks'
import type { User } from '../types'

export type SignupData = {
  email: string
  password: string
}

export type SignupResult = {
  message: string
  user: User
}

export async function signup(data: SignupData): Promise<SignupResult> {
  if (IS_DEV_STAGE) return mockSignup(data)
  return api<SignupResult>('/signup', {
    method: 'POST',
    authenticated: false,
    body: data,
  })
}
