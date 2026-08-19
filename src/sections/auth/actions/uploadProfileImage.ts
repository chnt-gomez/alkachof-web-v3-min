import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUploadProfileImage } from '@/mocks'
import { api } from '@/lib/api'
import type { Profile } from '../types'

export async function uploadProfileImage(profileId: string, file: File): Promise<string> {
  if (IS_DEV_STAGE) return mockUploadProfileImage(profileId, file)
  const form = new FormData()
  form.append('image', file)
  const { profile } = await api<{ profile: Profile }>(`/profile/${profileId}/image`, {
    method: 'POST',
    body: form,
  })
  return profile.profile_picture_url ?? ''
}
