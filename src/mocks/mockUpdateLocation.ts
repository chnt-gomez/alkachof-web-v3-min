import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import type { LocationInput } from '@/sections/catalog/actions/createLocation'
import { updateLocationInStore } from './mockLocationStore'

export function mockUpdateLocation(
  locationId: string,
  input: LocationInput,
): Promise<CatalogLocation> {
  return Promise.resolve(updateLocationInStore(locationId, input))
}
