import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUpdateLocation } from '@/mocks'
import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import type { LocationInput } from './createLocation'

/** Updates an existing location by id. Owner-only. */
export async function updateLocation(
  locationId: string,
  input: LocationInput,
): Promise<CatalogLocation> {
  if (IS_DEV_STAGE) return mockUpdateLocation(locationId, input)
  const data = await api<{ location: CatalogLocation }>(`/location/${locationId}/update`, {
    method: 'POST',
    body: input,
  })
  return data.location
}
