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
  /**
   * Whether the seller opted this shop into `GET /location/lookup`, the one call
   * behind `/map`. Owner-written through `setCatalogDiscoverable` and nothing
   * else; publicly readable; `false` by default.
   *
   * **Always present.** The API sends a boolean even for rows written before the
   * column existed, so there is no absent case to defend against — see
   * `docs.OptInMapDiscoverable.frontend.md` §2.
   *
   * It governs search results and nothing more. This read is public and
   * ungated, so the full address comes back either way and the catalog's own
   * page still draws the exact pin. **Never describe it to a seller as
   * privacy.**
   */
  is_discoverable: boolean
}

/** Reads a catalog's location. Public endpoint; returns `null` when unset. */
export async function fetchCatalogLocation(catalogId: string): Promise<CatalogLocation | null> {
  const data = await api<{ location: CatalogLocation | null }>(`/location/catalog/${catalogId}`, {
    authenticated: false,
  })
  return data.location
}
