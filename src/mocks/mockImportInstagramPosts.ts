import type {
  ImportPostsResult,
  ImportSelection,
  ImportedPost,
  SkippedPost,
} from '@/sections/catalog/actions/importInstagramPosts'
import { MAX_POSTS_PER_IMPORT } from '@/sections/catalog/actions/importInstagramPosts'
import {
  mockInstagramPosts,
  mockMarkPostImported,
  mockPreviewExpired,
} from './mockInstagramStore'
import { randomId } from './random'

/**
 * Mirrors the real endpoint's partial-success shape: every selection lands in
 * exactly one of the two lists, and an occasional post is skipped so the
 * summary's skip path is reachable in dev.
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

  const feed = mockInstagramPosts()
  const imported: ImportedPost[] = []
  const skipped: SkippedPost[] = []

  for (const selection of selections) {
    const post = feed.find((p) => p.contentId === selection.contentId)
    if (!post) {
      skipped.push({
        contentId: selection.contentId,
        reason: "That post is not in this seller's imported feed",
      })
      continue
    }
    if (post.imported) {
      skipped.push({
        contentId: selection.contentId,
        reason: 'That post has already been imported',
      })
      continue
    }
    if (mockPreviewExpired()) {
      skipped.push({
        contentId: selection.contentId,
        reason: 'That post has no downloadable image',
      })
      continue
    }

    const itemId = `item_${randomId()}`
    mockMarkPostImported(post.contentId, itemId)
    imported.push({
      contentId: post.contentId,
      item: {
        _id: itemId,
        name: selection.name ?? post.title,
        price: selection.price ?? 0,
        imgPath: post.previewUrl,
      },
    })
  }

  return Promise.resolve({ ok: true, imported, skipped })
}
