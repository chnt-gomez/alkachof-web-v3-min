/**
 * Where the persisted query cache lives, and how to drop it.
 *
 * A leaf module on purpose: both `queryClient.ts` (which resets the cache for
 * callers with no React context) and `queryPersist.tsx` (which owns the
 * persister) need this, and routing it through either of them would make the two
 * import each other.
 */
export const QUERY_STORAGE_KEY = 'alkachof.query'

/**
 * Drops the persisted blob.
 *
 * Called on both session-end paths. Clearing memory alone is not enough once the
 * cache is on disk: it outlives the tab, and two users on one phone is an
 * ordinary case for this product.
 *
 * Swallows its error deliberately — Safari private mode throws on `localStorage`,
 * and a logout must not fail because of it. If the write threw, nothing was
 * stored to begin with.
 */
export function clearPersistedCache(): void {
  try {
    window.localStorage.removeItem(QUERY_STORAGE_KEY)
  } catch {
    /* storage unavailable — nothing was written either */
  }
}
