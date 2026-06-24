import { randomId } from './random'

export function mockUploadItemImage(file: File): Promise<{ url: string }> {
  const seed = encodeURIComponent(file.name.replace(/\s+/g, '_') || randomId())
  return Promise.resolve({ url: `https://picsum.photos/seed/${seed}/600/600` })
}
