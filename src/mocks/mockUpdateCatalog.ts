import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { __mockCatalogsCache } from './mockFetchMyCatalogs'
import { bumpCatalogStamp } from './mockCatalogStampStore'

export function mockUpdateCatalog(catalogId: string, patch: Partial<Catalog>): Promise<Catalog> {
  bumpCatalogStamp(catalogId)
  const cache = __mockCatalogsCache()
  const cached = cache.find((c) => c._id === catalogId)

  // Merge onto the cached catalog rather than a blank one so fields the form
  // never sends — `image` above all — survive a save instead of being wiped.
  const base: Catalog = cached ?? {
    _id: catalogId,
    userId: 'user_mock',
    alias: 'Mi Tienda',
    welcomeText: '',
    description: '',
    payOptions: [],
    deliveryType: [],
    location: '',
    locationZip: '',
    deliveryDates: [],
    deliveryLocations: [],
  }

  const updated: Catalog = { ...base, ...patch }
  if (cached) cache[cache.indexOf(cached)] = updated
  return Promise.resolve(updated)
}
