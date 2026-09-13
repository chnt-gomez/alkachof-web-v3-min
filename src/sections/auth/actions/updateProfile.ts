import { api } from '@/lib/api'
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
  const data = await api<{ profile: Profile }>(`/profile/${profileId}/update`, {
    method: 'POST',
    body: patch,
  })
  return data.profile
}
