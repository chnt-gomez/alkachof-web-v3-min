import type { InstagramPostsResult } from '@/sections/catalog/actions/fetchInstagramPosts'
import {
  mockInstagramAvailableAt,
  mockInstagramEnrolled,
  mockInstagramPosts,
} from './mockInstagramStore'

export function mockFetchInstagramPosts(): Promise<InstagramPostsResult> {
  if (!mockInstagramEnrolled()) {
    return Promise.resolve({ ok: false, reason: 'notEnrolled' })
  }
  // The billed call in production, and the reason the gate is checked before it
  // rather than after — mirrored here so the 429 path is reachable in dev.
  const availableAt = mockInstagramAvailableAt()
  if (availableAt) {
    return Promise.resolve({ ok: false, reason: 'cooldown', availableAt })
  }
  // Copies, so a caller holding the previous page cannot mutate the store.
  return Promise.resolve({ ok: true, posts: mockInstagramPosts().map((post) => ({ ...post })) })
}
