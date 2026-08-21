import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { __mockCatalogsCache } from './mockFetchMyCatalogs'

/**
 * Applies an image change to the shared dev-stage catalog cache so the editor,
 * the Home card, and the public view all agree after an upload or a delete.
 * Falls back to a synthetic catalog for ids that are not the owner's own.
 */
export function writeCatalogImage(catalogId: string, image: string | undefined): Catalog {
  const cache = __mockCatalogsCache()
  const cached = cache.find((c) => c._id === catalogId)

  const base: Catalog = cached ?? {
    _id: catalogId,
    userId: 'me',
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

  // The real API omits the key entirely when there is no image — mirror that
  // rather than setting `undefined`, so consumers exercise the absent branch.
  const updated: Catalog = { ...base }
  if (image === undefined) delete updated.image
  else updated.image = image

  if (cached) cache[cache.indexOf(cached)] = updated
  return updated
}
