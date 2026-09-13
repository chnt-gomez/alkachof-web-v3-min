import { api, ApiError, availableAtOf } from '@/lib/api'
import { MAX_CATALOG_ITEMS } from '@/lib/catalogLimits'

/**
 * The API refuses more than this in one call (`INSTAGRAM.MAX_CONVERT_BATCH`).
 *
 * It is the catalog's own item cap, not a number of its own: a seller gets one
 * metered scraper run per cooldown, so a batch smaller than what their catalog
 * can hold would refuse photos there was room for and make them wait a week for
 * the rest. **The number that actually bounds a seller's selection is how many
 * slots their catalog has left** — see `remainingCatalogSlots`; this is only the
 * ceiling that remainder can never exceed.
 */
export const MAX_POSTS_PER_IMPORT = MAX_CATALOG_ITEMS

export type ImportSelection = {
  /**
   * The only identifying field. The image, the account and the catalog are all
   * resolved server-side — sending a media or image url does nothing.
   */
  externalPostId: string
  /** Defaults to the caption's first line, trimmed to 100 characters. */
  name?: string
  /** Defaults to the full caption. */
  description?: string
  /**
   * Integer cents. Imports use the API's default of 0 — a freshly imported
   * product is priced afterwards like any other unpriced item.
   */
  price?: number
}

/** The subset of the created item the import reports back. */
export type ImportedItem = {
  _id: string
  name: string
  price: number
  imgPath: string
}

export type ImportedPost = { externalPostId: string; item: ImportedItem }
export type SkippedPost = { externalPostId: string; reason: string }

export type ImportPostsResult =
  /**
   * 201. Partial success is the normal case — every selection lands in exactly
   * one of the two lists, so `imported.length` is the success count and
   * `skipped` must be shown with its reasons.
   *
   * Refetching the feed used to be the fix for every skip reason. It still is,
   * but a successful import starts the seller's cooldown, so that refetch is
   * days away — which is what `nextAvailable` is for. Show the date instead of
   * inviting a retry the gate will refuse.
   */
  | {
      ok: true
      imported: ImportedPost[]
      skipped: SkippedPost[]
      /** ISO 8601 when this import started a cooldown; null when nothing landed. */
      nextAvailable: string | null
    }
  /** 400 — nothing was created. */
  | { ok: false; reason: 'invalid'; message: string }
  /** 403 — the catalog was already full before anything ran. */
  | { ok: false; reason: 'catalogFull' }
  /** 404 — the seller has no catalog. */
  | { ok: false; reason: 'noCatalog' }
  /**
   * 429 — either the per-seller import cooldown or the shared upload budget (40
   * per 15 min). Deliberately one case: both answer with `availableAt`, and the
   * only honest thing to tell the seller in either is the date, so branching on
   * which limiter spoke would change nothing on screen.
   */
  | { ok: false; reason: 'cooldown'; availableAt: string | null }
  | { ok: false; reason: 'error'; message: string }

/**
 * Turns selected posts into catalog products. Each post is a download plus an
 * image re-encode done one at a time, so this can take several seconds — the
 * caller must show progress and block a second import while one is in flight.
 *
 * **An import that lands anything starts the seller's cooldown**, which is why
 * the UI has to say so *before* the seller commits: they get one pass, and the
 * photos they leave unselected wait until `nextAvailable`.
 */
export async function importInstagramPosts(
  posts: ImportSelection[],
): Promise<ImportPostsResult> {
  try {
    const data = await api<{
      imported: ImportedPost[]
      skipped: SkippedPost[]
      nextAvailable?: string | null
    }>('/instagram/convert', { method: 'POST', body: { posts } })
    return {
      ok: true,
      imported: data.imported ?? [],
      skipped: data.skipped ?? [],
      nextAvailable: data.nextAvailable ?? null,
    }
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
          return { ok: false, reason: 'cooldown', availableAt: availableAtOf(err) }
      }
    }
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
