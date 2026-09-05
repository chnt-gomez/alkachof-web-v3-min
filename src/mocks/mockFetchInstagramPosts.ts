import type { InstagramPostsResult } from '@/sections/catalog/actions/fetchInstagramPosts'
import { mockInstagramPosts, mockInstagramStatus } from './mockInstagramStore'

export function mockFetchInstagramPosts(): Promise<InstagramPostsResult> {
  if (mockInstagramStatus() !== 'CONNECTED') {
    return Promise.resolve({ ok: false, reason: 'notConnected' })
  }
  // Copies, so a caller holding the previous page cannot mutate the store.
  return Promise.resolve({ ok: true, posts: mockInstagramPosts().map((post) => ({ ...post })) })
}
