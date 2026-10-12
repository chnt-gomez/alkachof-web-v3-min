import { readCookie, writeCookie, deleteCookie } from './cookies'
import { isValidCoords, type Coords } from './geolocation'

/**
 * The last position the device actually reported, remembered across reloads so
 * the map opens where the user is instead of on the Ciudad de México fallback.
 *
 * It is a **hint for the first frame, not a location**. The live fix still
 * arrives seconds later and the map flies to it; this only decides what is on
 * screen until then, which turns a cross-country zoom into a short pan.
 *
 * Second owner of a cookie in this app, alongside `auth.ts`: `cookies.ts` owns
 * the *format*, each caller owns its own name, lifetime and meaning.
 */

const LAST_LOCATION_COOKIE = 'alk.lastLoc'

/**
 * Long enough to cover ordinary use of the app, short enough that a device left
 * in a drawer does not carry a position around indefinitely. Precision is what
 * bounds the privacy cost (see `PRECISION`); this bounds the duration.
 *
 * It does not need to be accurate: a user who moved gets the right map a second
 * later, from the fix.
 */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Three decimals — about 110 m.
 *
 * **Deliberately coarse, and not a rounding convenience.** A cookie rides along
 * on every same-origin request, so whatever is stored here is also written into
 * the web server's access log on every page load. A map centre hint does not
 * need street precision: at the opening zoom the viewport is ~1.8 km across, so
 * 110 m is invisible on screen — and it is the difference between a hint and a
 * movement trail in nginx's logs.
 */
const PRECISION = 3

function round(value: number): number {
  const factor = 10 ** PRECISION
  return Math.round(value * factor) / factor
}

/**
 * The remembered position, or null when there is none to trust.
 *
 * **Validated, not just parsed.** A truncated, hand-edited or stale-format
 * cookie must read as "no hint": `map.flyTo([NaN, NaN])` throws inside Leaflet
 * and would take the whole screen down over a cosmetic optimisation.
 */
export function readLastLocation(): Coords | null {
  const raw = readCookie(LAST_LOCATION_COOKIE)
  if (!raw) return null
  const [latPart, lngPart, ...rest] = raw.split(',')
  if (rest.length > 0 || lngPart === undefined) return null
  const lat = Number(latPart)
  const lng = Number(lngPart)
  // `Number('')` is 0, so an empty half would otherwise read as the equator.
  if (latPart.trim() === '' || lngPart.trim() === '') return null
  if (!isValidCoords(lat, lng)) return null
  return { lat, lng }
}

/**
 * Remembers a position. **Only ever called with a real device fix** — never the
 * fallback centre, and never a viewport the user panned to: someone browsing
 * another city must not have the next cold start open somewhere they have never
 * been.
 *
 * **Never throws.** Unlike `setTokens`, where a refused cookie means a login
 * that silently did not happen, a hint that cannot be stored costs one
 * animation on the next visit.
 */
export function saveLastLocation(coords: Coords): void {
  try {
    writeCookie(
      LAST_LOCATION_COOKIE,
      `${round(coords.lat)},${round(coords.lng)}`,
      MAX_AGE_SECONDS,
    )
  } catch {
    // Cookies disabled, or the origin's budget already spent. Not worth telling
    // the user about: the map works, it just starts further away.
  }
}

/** Forgets the hint. Used by the test setup; no product surface removes it yet. */
export function clearLastLocation(): void {
  deleteCookie(LAST_LOCATION_COOKIE)
}
