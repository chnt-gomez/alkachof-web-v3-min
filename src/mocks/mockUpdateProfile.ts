import type { Profile } from '@/sections/auth/types'
import type { ProfileFields } from '@/sections/auth/actions/updateProfile'
import { writeProfile } from './mockProfileStore'

export function mockUpdateProfile(
  _profileId: string,
  patch: Partial<ProfileFields>
): Promise<Profile> {
  return Promise.resolve(writeProfile(patch))
}
