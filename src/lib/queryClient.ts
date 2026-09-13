import { QueryClient } from '@tanstack/react-query'
import { clearPersistedCache } from './queryStorage'

/**
 * The app's cache policy, in one place.
 *
 * Every default here is the opposite of the library's, deliberately. React Query
 * ships tuned for dashboards on a desk — refetch on focus, on reconnect, on
 * mount, retry three times. Alkachof runs on a phone on mobile data, and the
 * rows it caches (a seller's own catalog, their own profile, their Instagram
 * enrollment) change only through mutations this client performs. Those
 * mutations write their response straight into the cache, so a focus- or
 * timer-driven refetch would spend a request to learn something we already hold.
 *
 * These defaults apply to **owner-owned rows only**. Anything another user
 * writes needs its own `staleTime` and a reason.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        // Matters more than usual: with `refetchOnMount: false`, an entry that
        // is garbage-collected after its last observer unmounts refetches on the
        // next mount. A `gcTime` shorter than a session would silently undo the
        // whole point of this cache.
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        // The library default is 3, so one dead endpoint becomes four requests.
        retry: 1,
      },
      mutations: { retry: 0 },
    },
  })
}

/**
 * The app's single client. Module scope, so it outlives the React tree the way
 * a cache has to — which is exactly why `resetAppCache` below is not optional.
 *
 * Tests never touch this: they build their own client per test (see
 * `src/test/renderWithProviders.tsx`), because a shared one lets an entry
 * written by one test satisfy another, and that failure looks like a pass.
 */
export const queryClient = createQueryClient()

/**
 * Drops every cached row on the singleton above. **Security, not housekeeping.**
 *
 * Two users on one phone is an ordinary case for this product, and the cache
 * holds one seller's catalog, profile and Instagram state. It used to empty
 * itself because it was React state that died with the tree; a module-scope
 * client does not.
 *
 * **For callers with no React context only** — today that is the 401 give-up
 * path in `api.ts`. Anything inside the tree must clear the client it was
 * given (`useQueryClient().clear()`, as `logout` does): in the app the two are
 * the same instance, but a caller that mounts its own provider would otherwise
 * empty a client nobody is reading.
 */
export function resetAppCache(): void {
  queryClient.clear()
  // The disk half. Clearing memory alone would leave the previous session's rows
  // on the device, which is the whole reason persistence needs a boundary.
  clearPersistedCache()
}
