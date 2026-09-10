import { api } from '@/lib/api'
import type { Profile } from '../types'

export async function fetchProfile(): Promise<Profile> {
  const data = await api<{ profile: Profile }>('/profile')
  return data.profile
}
