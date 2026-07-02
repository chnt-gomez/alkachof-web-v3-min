import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUploadItemImage } from '@/mocks'
import { api } from '@/lib/api'

// Endpoint shape pending backend confirmation (carry-over C7).
// Assumed contract: multipart POST returns { url } for the persisted image.
export async function uploadItemImage(file: File): Promise<string> {
  if (IS_DEV_STAGE) {
    const { url } = await mockUploadItemImage(file)
    return url
  }
  const form = new FormData()
  form.append('image', file)
  const { url } = await api<{ url: string }>('/upload/image', {
    method: 'POST',
    body: form,
  })
  return url
}
