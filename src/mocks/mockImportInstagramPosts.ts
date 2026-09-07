import type {
  ImportPostsResult,
  ImportSelection,
  ImportedPost,
  SkippedPost,
} from '@/sections/catalog/actions/importInstagramPosts'
import { MAX_POSTS_PER_IMPORT } from '@/sections/catalog/actions/importInstagramPosts'
import {
  mockInstagramAvailableAt,
  mockInstagramPosts,
  mockMarkPostImported,
  mockPreviewExpired,
  mockStartInstagramCooldown,
} from './mockInstagramStore'
import { randomId } from './random'

/**
 * Mirrors the real endpoint's partial-success shape: every selection lands in
 * exactly one of the two lists, and an occasional post is skipped so the
 * summary's skip path is reachable in dev.
 *
 * Also mirrors the cooldown: importing anything holds the next scraper run for
 * `MOCK_COOLDOWN_DAYS`, so the disabled catalog button and the cooldown screen
 * both show up in dev right after a successful import.
 */
export function mockImportInstagramPosts(
  selections: ImportSelection[],
): Promise<ImportPostsResult> {
  if (selections.length === 0) {
    return Promise.resolve({
      ok: false,
      reason: 'invalid',
      message: 'Select at least one post to import',
    })
  }
  if (selections.length > MAX_POSTS_PER_IMPORT) {
    return Promise.resolve({
      ok: false,
      reason: 'invalid',
      message: 'Too many posts selected for one import',
    })
  }

  // Gated on entry, like the API: a client holding a feed from before the
  // cooldown must not be able to keep importing from it.
  const availableAt = mockInstagramAvailableAt()
  if (availableAt) {
    return Promise.resolve({ ok: false, reason: 'cooldown', availableAt })
  }

  const feed = mockInstagramPosts()
  const imported: ImportedPost[] = []
  const skipped: SkippedPost[] = []

  for (const selection of selections) {
    const post = feed.find((p) => p.externalPostId === selection.externalPostId)
    if (!post) {
      skipped.push({
        externalPostId: selection.externalPostId,
        reason: "That post is not in this seller's imported feed",
      })
      continue
    }
    if (post.isConverted) {
      skipped.push({
        externalPostId: selection.externalPostId,
        reason: 'That post has already been imported',
      })
      continue
    }
    if (mockPreviewExpired()) {
      skipped.push({
        externalPostId: selection.externalPostId,
        reason: 'That post has no downloadable image',
      })
      continue
    }

    const itemId = `item_${randomId()}`
    mockMarkPostImported(post.externalPostId, itemId)
    imported.push({
      externalPostId: post.externalPostId,
      item: {
        _id: itemId,
        name: selection.name ?? post.caption.split('\n')[0],
        price: selection.price ?? 0,
        imgPath: post.mediaUrl,
      },
    })
  }

  // Only a batch that created something starts the cooldown — a run that
  // imported nothing spent the seller's allowance on our failure.
  const nextAvailable = imported.length > 0 ? mockStartInstagramCooldown() : null

  return Promise.resolve({ ok: true, imported, skipped, nextAvailable })
}
