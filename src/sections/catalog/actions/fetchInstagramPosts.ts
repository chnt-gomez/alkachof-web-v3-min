import { api, ApiError } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchInstagramPosts } from '@/mocks'

export type InstagramPostFormat = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT' | 'OTHER'

export type InstagramPost = {
  /** The only identifying field an import accepts. */
  contentId: string
  title: string
  description: string
  format: InstagramPostFormat
  /** Permalink on instagram.com. */
  url: string
  publishedAt: string
  /**
   * A SIGNED link that expires within hours. Render it in an `<img>` and
   * nothing else: never persist it, never send it back to the API, never store
   * it against an item. The product image an import creates is a separate copy
   * in Alkachof's own storage. Refetching this endpoint mints fresh links.
   */
  previewUrl: string
  /** Already a product. Selection is refused server-side a second time. */
  imported: boolean
  /** The item it became, when `imported`. */
  itemId: string | null
}

export type InstagramPostsResult =
  | { ok: true; posts: InstagramPost[] }
  /** 400 — no Instagram account is linked. Send them back to the connect screen. */
  | { ok: false; reason: 'notConnected' }
  /** 502 — Phyllo unreachable. Retryable. */
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'error'; message: string }

/**
 * Refreshes the cached feed from Phyllo and returns it, newest first. One page
 * of up to 50 posts — there is no pagination, so older posts are unreachable.
 */
export async function fetchInstagramPosts(): Promise<InstagramPostsResult> {
  if (IS_DEV_STAGE) return mockFetchInstagramPosts()

  try {
    const data = await api<{ posts: InstagramPost[] }>('/phyllo/posts')
    return { ok: true, posts: data.posts ?? [] }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 400) return { ok: false, reason: 'notConnected' }
      if (err.status === 502) return { ok: false, reason: 'unavailable' }
    }
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
