import { randomId } from './random'

export function mockUploadProfileImage(_profileId: string, file: File): Promise<{ url: string }> {
  const seed = encodeURIComponent(file.name.replace(/\s+/g, '_') || randomId())
  return Promise.resolve({ url: `https://picsum.photos/seed/profile_${seed}/400/400` })
}
