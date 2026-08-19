import { randomId } from './random'
import { writeProfile } from './mockProfileStore'

export function mockUploadProfileImage(_profileId: string, file: File): Promise<string> {
  const seed = encodeURIComponent(file.name.replace(/\s+/g, '_') || randomId())
  const url = `https://picsum.photos/seed/profile_${seed}/400/400`
  writeProfile({ profile_picture_url: url })
  return Promise.resolve(url)
}
