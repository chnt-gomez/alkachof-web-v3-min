import { api } from '@/lib/api'
import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import type { LocationInput } from './createLocation'

/** Updates an existing location by id. Owner-only. */
export async function updateLocation(
  locationId: string,
  input: LocationInput,
): Promise<CatalogLocation> {
  const data = await api<{ location: CatalogLocation }>(`/location/${locationId}/update`, {
    method: 'POST',
    body: input,
  })
  return data.location
}
