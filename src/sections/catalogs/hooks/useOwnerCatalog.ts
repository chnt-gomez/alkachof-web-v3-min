import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchMyCatalog } from '../actions/fetchMyCatalog'
import { fetchCatalogItems } from '@/sections/catalog/actions/fetchCatalogItems'

/**
 * The authenticated owner's catalog and its items, as **one shared pair of cache
 * entries**.
 *
 * This is the point of the module. Home's "Mi catálogo" tile and the catalog
 * editor each used to load both resources for themselves, so bouncing between
 * the two tabs re-read a catalog that had not changed — four requests for two
 * rows. They now land on the same keys, and the second screen pays nothing.
 *
 * Every user has exactly one catalog and the backend resolves it from the auth
 * token, so `myCatalog` needs no id — which is also why it is safe to key
 * globally rather than per user: `resetAppCache()` drops it at logout.
 */
export function useMyCatalog(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myCatalog(),
    queryFn: fetchMyCatalog,
    enabled,
  })
}

/**
 * The items of the owner's catalog. A dependent query: the id only exists once
 * `useMyCatalog` has answered, so this stays disabled until then. A disabled
 * query reports `isLoading: false`, which is what lets a caller write
 * `catalogIsLoading || itemsAreLoading` and get the right answer at every step.
 *
 * Reads the **authenticated** `/catalog/:id/items`, not the public one the
 * visitor view uses. Same path, different auth and different caller — do not
 * point the public catalog at this key.
 */
export function useCatalogItems(catalogId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.catalogItems(catalogId ?? ''),
    queryFn: () => fetchCatalogItems(catalogId as string),
    enabled: enabled && Boolean(catalogId),
  })
}
