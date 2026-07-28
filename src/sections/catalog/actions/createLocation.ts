import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockCreateLocation } from '@/mocks'
import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'

/**
 * Editable location fields. All optional and shared by create/update. `catalogId`
 * and `zoneId` are never sent — the URL carries the catalog and the server owns
 * the zone.
 */
export type LocationInput = {
  lat?: number
  lng?: number
  street_name?: string
  city?: string
  state?: string
  number?: string
  additional_number?: string
  neighborhood?: string
}

/** Creates the catalog's location. Owner-only. */
export async function createLocation(
  catalogId: string,
  input: LocationInput,
): Promise<CatalogLocation> {
  if (IS_DEV_STAGE) return mockCreateLocation(catalogId, input)
  const data = await api<{ location: CatalogLocation }>(`/location/catalog/${catalogId}`, {
    method: 'POST',
    body: input,
  })
  return data.location
}
