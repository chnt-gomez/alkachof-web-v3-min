/**
 * The device's position, asked for once.
 *
 * Shared by the catalog's location picker and the buy-side map, which must fail
 * with the *same* sentence for the same reason — and must keep telling apart the
 * two failures that look alike and are not: a device with no geolocation API at
 * all (retrying changes nothing) and a user who refused or whose fix timed out
 * (retrying is the only way back).
 *
 * **Secure context only.** `navigator.geolocation` is unavailable over plain
 * http, so `npm run dev` reached from a phone over a LAN ip (`http://192.168…`)
 * fails here in a way indistinguishable from a denial. `localhost` is exempt.
 */

export type Coords = { lat: number; lng: number }

export type GeolocationFailure = 'unsupported' | 'denied'

export type DeviceLocation =
  | { ok: true; coords: Coords }
  | { ok: false; reason: GeolocationFailure }

/** Ciudad de México — the fallback center for a map with no position yet. */
export const DEFAULT_CENTER: Coords = { lat: 19.4326, lng: -99.1332 }

const POSITION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10_000 }

const EARTH_RADIUS_METERS = 6_371_000

/**
 * Whether a pair is a usable coordinate.
 *
 * Shared on purpose: the remembered-position cookie validates what it reads
 * because `flyTo([NaN, NaN])` throws inside Leaflet, and the proximity lookup
 * validates what it sends because a **400 counts against the API's rate
 * budget** — six malformed calls lock the client out for a minute.
 */
export function isValidCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  )
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/**
 * Great-circle distance in metres (haversine).
 *
 * This is what decides whether the map has left the circle of results it is
 * holding, so it must not be the flat-earth approximation: at Mexico's
 * latitudes a 7 km threshold measured with plain Pythagoras on raw degrees is
 * out by hundreds of metres, which is a refetch that fires early or late
 * depending on which way the user walked.
 */
export function distanceBetween(a: Coords, b: Coords): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Never rejects: both outcomes are ordinary, and a caller that has to tell them
 * apart inside a `catch` ends up guessing which one it got.
 */
export function getDeviceLocation(): Promise<DeviceLocation> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ok: false, reason: 'unsupported' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => resolve({ ok: false, reason: 'denied' }),
      POSITION_OPTIONS,
    )
  })
}

/** The user-facing sentence for a failure. One wording per reason, app-wide. */
export function geolocationMessage(reason: GeolocationFailure): string {
  return reason === 'unsupported'
    ? 'Tu dispositivo no permite obtener la ubicación.'
    : 'No pudimos obtener tu ubicación. Revisa los permisos e inténtalo de nuevo.'
}
