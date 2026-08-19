import type { Profile } from '@/sections/auth/types'
import { readProfile } from './mockProfileStore'

export function mockFetchProfile(): Promise<Profile> {
  return Promise.resolve(readProfile())
}
