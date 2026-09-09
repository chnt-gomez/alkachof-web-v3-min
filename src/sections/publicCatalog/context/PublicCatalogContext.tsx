import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from '@/sections/auth/useAuth'
import { fetchPublicCatalog, type Catalog } from '../actions/fetchPublicCatalog'
import { fetchCatalogItems, type Item } from '../actions/fetchCatalogItems'
import { usePublicCatalogFreshness } from '../hooks/usePublicCatalogFreshness'

type PublicCatalogState = {
  catalog: Catalog | null
  items: Item[]
  isLoading: boolean
  error: string | null
  notFound: boolean
  /**
   * The visitor is the catalog's owner, looking at their own shop. They may
   * browse it, but every buyer-side action (buying, asking, requesting) is
   * meaningless against themselves and rejected by the backend, so the UI
   * blocks it up front. Computed once here so every consumer agrees.
   */
  isOwner: boolean
}

const PublicCatalogContext = createContext<PublicCatalogState | null>(null)

/**
 * Someone else's shop.
 *
 * Cached, unlike before — but **not on the defaults in `queryClient.ts`**. Those
 * exist for rows only this client writes; this one is written by another seller,
 * and by any visitor who asks a question. What makes it cacheable is
 * `usePublicCatalogFreshness`: one ~80-byte stamp read decides whether the copy
 * we hold is still the shop.
 *
 * The catalog's **location** is deliberately not part of this. The API does not
 * move the stamp when a location is edited, so `useCatalogLocation` keeps
 * fetching it on every visit — a cached location would go stale with nothing to
 * catch it.
 */
export function PublicCatalogProvider({
  catalogId,
  children,
}: {
  catalogId: string
  children: React.ReactNode
}) {
  const { profile } = useAuth()

  // `staleTime: Infinity` here means "never refetch on a timer", not "this can
  // never change" — the freshness gate below is the only thing that invalidates
  // it, and that is the point. Stated explicitly rather than inherited, because
  // the global defaults reach the same values by reasoning that does not apply
  // to a row somebody else owns.
  const shared = { staleTime: Infinity, refetchOnMount: false as const }

  const catalogQuery = useQuery({
    queryKey: queryKeys.publicCatalog(catalogId),
    queryFn: () => fetchPublicCatalog(catalogId),
    ...shared,
  })

  const itemsQuery = useQuery({
    queryKey: queryKeys.publicCatalogItems(catalogId),
    queryFn: () => fetchCatalogItems(catalogId),
    ...shared,
  })

  usePublicCatalogFreshness(catalogId, catalogQuery.data !== undefined)

  const catalog = catalogQuery.data ?? null
  const items = itemsQuery.data ?? []
  const isLoading = catalogQuery.isLoading || itemsQuery.isLoading

  const notFound = catalogQuery.error instanceof ApiError && catalogQuery.error.status === 404
  const error = notFound ? null : ((catalogQuery.error ?? itemsQuery.error)?.message ?? null)

  const isOwner = Boolean(catalog && profile && catalog.userId === profile.userId)

  return (
    <PublicCatalogContext.Provider
      value={{ catalog, items, isLoading, error, notFound, isOwner }}
    >
      {children}
    </PublicCatalogContext.Provider>
  )
}

export function usePublicCatalog() {
  const ctx = useContext(PublicCatalogContext)
  if (!ctx) throw new Error('usePublicCatalog must be used inside PublicCatalogProvider')
  return ctx
}
