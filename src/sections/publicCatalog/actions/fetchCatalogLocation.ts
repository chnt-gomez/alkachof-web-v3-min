import { api } from '@/lib/api'

/**
 * A catalog's structured location. It is a separate backend resource linked to a
 * catalog by `catalogId` — a catalog may have no location, in which case the read
 * endpoints return `null`.
 *
 * `lat` / `lng` are decimal degrees (not cents). `neighborhood` is the Mexican
 * *colonia*, `additional_number` the interior/apartment number. `zoneId` is a
 * server-managed placeholder (always `null` for now).
 */
export type CatalogLocation = {
  _id: string
  lat: number
  lng: number
  street_name: string
  city: string
  state: string
  number: string
  additional_number: string
  neighborhood: string
  catalogId: string
  zoneId: string | null
}

/** Reads a catalog's location. Public endpoint; returns `null` when unset. */
export async function fetchCatalogLocation(catalogId: string): Promise<CatalogLocation | null> {
  const data = await api<{ location: CatalogLocation | null }>(`/location/catalog/${catalogId}`, {
    authenticated: false,
  })
  return data.location
}
