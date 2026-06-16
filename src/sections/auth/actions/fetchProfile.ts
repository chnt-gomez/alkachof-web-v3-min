import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchProfile } from '@/mocks'
import type { Profile } from '../types'

export async function fetchProfile(): Promise<Profile> {
  if (IS_DEV_STAGE) return mockFetchProfile()
  const data = await api<{ profile: Profile }>('/profile')
  return data.profile
}
