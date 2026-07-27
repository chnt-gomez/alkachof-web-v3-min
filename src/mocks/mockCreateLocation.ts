import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import type { LocationInput } from '@/sections/catalog/actions/createLocation'
import { createLocationInStore } from './mockLocationStore'

export function mockCreateLocation(
  catalogId: string,
  input: LocationInput,
): Promise<CatalogLocation> {
  return Promise.resolve(createLocationInStore(catalogId, input))
}
