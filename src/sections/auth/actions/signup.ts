import { api } from '@/lib/api'
import type { User } from '../types'

export type SignupData = {
  email: string
  password: string
  phone: string
}

export type SignupResult = {
  message: string
  user: User
}

export async function signup(data: SignupData): Promise<SignupResult> {
  return api<SignupResult>('/signup', {
    method: 'POST',
    authenticated: false,
    body: data,
  })
}
