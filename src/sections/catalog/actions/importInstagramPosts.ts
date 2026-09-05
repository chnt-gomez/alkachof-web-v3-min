import { api, ApiError } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockImportInstagramPosts } from '@/mocks'

/** The API refuses more than this in one call. */
export const MAX_POSTS_PER_IMPORT = 10

export type ImportSelection = {
  /**
   * The only identifying field. The image, the account and the catalog are all
   * resolved server-side — sending a media or image url does nothing.
   */
  contentId: string
  /** Defaults to the caption's first line, trimmed to 100 characters. */
  name?: string
  /** Defaults to the full caption. */
  description?: string
  /** Integer cents. Omitted means 0 and the seller prices it afterwards. */
  price?: number
}

/** The subset of the created item the import reports back. */
export type ImportedItem = {
  _id: string
  name: string
  price: number
  imgPath: string
}

export type ImportedPost = { contentId: string; item: ImportedItem }
export type SkippedPost = { contentId: string; reason: string }

export type ImportPostsResult =
  /**
   * 201. Partial success is the normal case — every selection lands in exactly
   * one of the two lists, so `imported.length` is the success count and
   * `skipped` must be shown with its reasons. Refetching the feed afterwards is
   * the right move for every skip reason.
   */
  | { ok: true; imported: ImportedPost[]; skipped: SkippedPost[] }
  /** 400 — nothing was created. */
  | { ok: false; reason: 'invalid'; message: string }
  /** 403 — the catalog was already full before anything ran. */
  | { ok: false; reason: 'catalogFull' }
  /** 404 — the seller has no catalog. */
  | { ok: false; reason: 'noCatalog' }
  /** 429 — shares the upload budget, 40 per 15 min. */
  | { ok: false; reason: 'rateLimited' }
  | { ok: false; reason: 'error'; message: string }

/**
 * Turns selected posts into catalog products. Each post is a download plus an
 * image re-encode done one at a time, so this can take several seconds — the
 * caller must show progress and block a second import while one is in flight.
 */
export async function importInstagramPosts(
  posts: ImportSelection[],
): Promise<ImportPostsResult> {
  if (IS_DEV_STAGE) return mockImportInstagramPosts(posts)

  try {
    const data = await api<{ imported: ImportedPost[]; skipped: SkippedPost[] }>(
      '/phyllo/import',
      { method: 'POST', body: { posts } },
    )
    return { ok: true, imported: data.imported ?? [], skipped: data.skipped ?? [] }
  } catch (err) {
    if (err instanceof ApiError) {
      switch (err.status) {
        case 400:
          return { ok: false, reason: 'invalid', message: err.message }
        case 403:
          return { ok: false, reason: 'catalogFull' }
        case 404:
          return { ok: false, reason: 'noCatalog' }
        case 429:
          return { ok: false, reason: 'rateLimited' }
      }
    }
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
