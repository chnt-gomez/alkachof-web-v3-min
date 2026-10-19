/**
 * The map's zoom bounds, kept out of the component file so `SearchMap.tsx` only
 * exports components (fast-refresh friendly) — same arrangement as `homeTabs.ts`.
 *
 * **The floor is the abuse guard.** The query this screen will eventually make
 * is `(center, radius)`, and the radius is read off the viewport — so a floor on
 * zoom-out is a ceiling on how much area one request can ask about, enforced by
 * the map itself rather than by a check someone has to remember to write. At
 * latitude 19.4° on a 390px-wide phone:
 *
 *   z=11  ~28 km across   the whole metro area — refused
 *   z=12  ~14 km across   a city's worth of districts — the floor
 *   z=15  ~1.8 km across  a few blocks — the opening view
 *   z=18  ~0.2 km across  a block
 *
 * So one request can never ask about more than a ~15 km radius. The same cap
 * belongs on the API side: this clamp is a courtesy, and a client cannot be the
 * control.
 *
 * It also bounds the bill this screen already has — OpenStreetMap's public tile
 * servers forbid heavy use, and a map opened at z=5 fetches tiles for a continent.
 *
 * There is deliberately **no pan leash** (`maxBounds`): panning to the next
 * colonia is the gesture this screen exists for, and panning does not make one
 * query larger — it makes queries more frequent, which is bounded by rate, not
 * by a fence. See `blueprint.LocationBasedSearch.md` §7.
 */

/** Opening view once the device position is known — a few blocks. */
export const INITIAL_ZOOM = 15

/** The floor. Leaflet simply stops zooming out here; no error copy needed. */
export const MIN_ZOOM = 12

/** OSM serves 19; 18 reads a street and leaves headroom. */
export const MAX_ZOOM = 18
