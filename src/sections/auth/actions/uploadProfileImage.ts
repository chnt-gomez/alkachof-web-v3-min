import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUploadProfileImage } from '@/mocks'
import { api } from '@/lib/api'

export async function uploadProfileImage(profileId: string, file: File): Promise<string> {
  if (IS_DEV_STAGE) {
    const { url } = await mockUploadProfileImage(profileId, file)
    return url
  }
  const form = new FormData()
  form.append('image', file)
  const { url } = await api<{ url: string }>(`/profile/${profileId}/image`, {
    method: 'POST',
    body: form,
  })
  return url
}
