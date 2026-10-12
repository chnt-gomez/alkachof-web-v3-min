import { api, ApiError, availableAtOf } from '@/lib/api'
import { isValidCoords, type Coords } from '@/lib/geolocation'

/**
 * `GET /location/lookup` — catalogs near a point. Contract:
 * `followup.LocationSearchApi.md`.
 *
 * **Public: `authenticated: false`.** A buyer browsing the map has not
 * necessarily logged in and the endpoint does not care who is asking. Sending a
 * token would be harmless but would make the call look like it needs one.
 */

/** One shop on the map. */
export type NearbyCatalog = {
  catalogId: string
  /** The shop name. **Can be `''`** — a seller who never named their catalog. */
  alias: string
  /** Catalog image url. **May be absent** — the seller never uploaded one. */
  image?: string
  /** **Approximate** — snapped to a ~110 m grid. A marker position, never an address. */
  lat: number
  lng: number
  /** Free text, may be `''`. */
  city: string
  neighborhood: string
  /** Metres, rounded to 100. `0` means "under 50 m". */
  distanceMeters: number
}

export type NearbyLookupResult =
  | {
      ok: true
      /** Nearest-first. **Keep this order** — it is the only ranking the API gives. */
      results: NearbyCatalog[]
      /** The only honest "is there more". Never derive it from `total`. */
      truncated: boolean
      /** The radius that actually applied, after server-side clamping. */
      radiusMeters: number
    }
  /** 404 — proximity search is not enabled on this deployment. Stop asking. */
  | { ok: false; reason: 'unavailable' }
  /** 429 — too many lookups from this address. Keep showing what you have. */
  | { ok: false; reason: 'rateLimited'; availableAt: string | null }
  /** A malformed point we refused to send, a 400, a timeout, or anything else. */
  | { ok: false; reason: 'error'; message: string }

/** The server's default, and the cold-call contract: 7 km. */
export const DEFAULT_RADIUS_METERS = 7000

/**
 * Looks up the catalogs around a point.
 *
 * `lat`/`lng` and nothing else — the defaults *are* the contract (7 km, 200
 * results), so hardcoding `radius=7000` here would mean a server-side change to
 * the radius needs a client release.
 *
 * `total` is read off the response and **thrown away on purpose**: it counts
 * rows before the active-seller filter, so it includes shops deliberately
 * withheld from `results`. The number to show is `results.length`.
 */
export async function lookupNearbyCatalogs(at: Coords): Promise<NearbyLookupResult> {
  // Validated here rather than at the server: a 400 counts against the API's
  // 6-per-minute budget, so six bad points lock this client out for a minute.
  if (!isValidCoords(at.lat, at.lng)) {
    return { ok: false, reason: 'error', message: 'Coordenadas inválidas' }
  }

  try {
    const data = await api<{
      results?: NearbyCatalog[]
      truncated?: boolean
      radiusMeters?: number
    }>(`/location/lookup?lat=${at.lat}&lng=${at.lng}`, { authenticated: false })
    return {
      ok: true,
      results: data.results ?? [],
      truncated: data.truncated === true,
      radiusMeters: data.radiusMeters ?? DEFAULT_RADIUS_METERS,
    }
  } catch (err) {
    if (err instanceof ApiError) {
      switch (err.status) {
        case 404:
          return { ok: false, reason: 'unavailable' }
        case 429:
          return { ok: false, reason: 'rateLimited', availableAt: availableAtOf(err) }
      }
    }
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
