import { api, ApiError, availableAtOf } from '@/lib/api'

/** Only IMAGE posts can become products, by product decision. */
export type InstagramMediaType = 'IMAGE' | 'VIDEO'

export type InstagramPost = {
  /** The only identifying field an import accepts. */
  externalPostId: string
  /** The Instagram caption. Its first line becomes the product name. */
  caption: string
  mediaType: InstagramMediaType
  /** Permalink on instagram.com. */
  permalink: string
  publishedAt: string
  /**
   * A CDN link that expires. Render it in an `<img>` and nothing else: never
   * persist it, never send it back to the API, never store it against an item.
   * The product image an import creates is a separate copy in Alkachof's own
   * storage. Refetching this endpoint mints fresh links.
   */
  mediaUrl: string
  /** Already a product. Selection is refused server-side a second time. */
  isConverted: boolean
  /** The item it became, when `isConverted`. */
  convertedItemId: string | null
}

export type InstagramPostsResult =
  | { ok: true; posts: InstagramPost[] }
  /** 400 — no Instagram account is linked yet. */
  | { ok: false; reason: 'notEnrolled' }
  /** 502 — the scraper is unreachable. Retryable. */
  | { ok: false; reason: 'unavailable' }
  /**
   * 429 — the seller already spent their scraper run for this cooldown. Not
   * retryable in any useful sense: `availableAt` is days away, so this is a
   * terminal screen with a date, never a "Reintentar" button.
   */
  | { ok: false; reason: 'cooldown'; availableAt: string | null }
  | { ok: false; reason: 'error'; message: string }

/**
 * The seller's feed, newest first.
 *
 * Takes no arguments, and that is the point: the account is resolved server-side
 * from the auth token via `ig_details`. There is no parameter that could point
 * this at somebody else's profile.
 *
 * One bounded page of up to 100 posts. There is no "load more" — the scraper has
 * no resume cursor into Instagram, so a second page would mean re-scraping from
 * the top. Calling this again refreshes the whole page.
 *
 * **Every call is a billed scraper run**, which is why the API gates it on a
 * per-seller cooldown and answers 429 once a seller has spent theirs. Check
 * `fetchInstagramStatus` before offering this, so the seller is not sent to a
 * refusal they could have been told about on the previous screen.
 */
export async function fetchInstagramPosts(): Promise<InstagramPostsResult> {
  try {
    const data = await api<{ posts: InstagramPost[] }>('/instagram/posts')
    return { ok: true, posts: data.posts ?? [] }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 400) return { ok: false, reason: 'notEnrolled' }
      if (err.status === 429) return { ok: false, reason: 'cooldown', availableAt: availableAtOf(err) }
      if (err.status === 502) return { ok: false, reason: 'unavailable' }
    }
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
