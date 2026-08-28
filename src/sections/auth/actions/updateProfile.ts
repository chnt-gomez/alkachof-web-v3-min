import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUpdateProfile } from '@/mocks'
import type { Profile } from '../types'

/**
 * The only fields `POST /profile/:profileId/update` accepts. `userId` is
 * deliberately absent: the backend merge would take it and reassign the
 * profile to another user.
 */
export type ProfileFields = Pick<Profile, 'alias' | 'profileDescription'>

export async function updateProfile(
  profileId: string,
  patch: Partial<ProfileFields>
): Promise<Profile> {
  if (IS_DEV_STAGE) return mockUpdateProfile(profileId, patch)
  const data = await api<{ profile: Profile }>(`/profile/${profileId}/update`, {
    method: 'POST',
    body: patch,
  })
  return data.profile
}
