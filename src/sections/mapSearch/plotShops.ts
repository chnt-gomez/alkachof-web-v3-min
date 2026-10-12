import type { NearbyCatalog } from './actions/lookupNearbyCatalogs'

/** A shop and the point it is actually drawn at. */
export type PlottedShop = {
  shop: NearbyCatalog
  lat: number
  lng: number
}

/**
 * How far apart overlapping shops are pushed. Well inside the API's own ~110 m
 * grid, so the nudge never implies more precision than the data has.
 */
const SPREAD_METERS = 18

const METERS_PER_DEGREE_LAT = 111_320

/**
 * Separates shops that share a point.
 *
 * The API snaps coordinates to a ~110 m grid, so two shops in the same block
 * routinely come back on the *same* lat/lng — stacked markers, with the one
 * underneath unreachable. They are pushed onto a small ring instead.
 *
 * **Deterministic**, by id order within the group: the same response must plot
 * identically every render, or markers would jump on every refresh. And
 * **never de-duplicated** — `catalogId` is the identity, two shops on one point
 * are two shops.
 */
export function plotShops(shops: NearbyCatalog[]): PlottedShop[] {
  const groups = new Map<string, NearbyCatalog[]>()
  for (const shop of shops) {
    const key = `${shop.lat},${shop.lng}`
    const group = groups.get(key)
    if (group) group.push(shop)
    else groups.set(key, [shop])
  }

  const plotted = new Map<string, PlottedShop>()
  for (const group of groups.values()) {
    if (group.length === 1) {
      const [shop] = group
      plotted.set(shop.catalogId, { shop, lat: shop.lat, lng: shop.lng })
      continue
    }
    const ordered = [...group].sort((a, b) => a.catalogId.localeCompare(b.catalogId))
    ordered.forEach((shop, index) => {
      const angle = (2 * Math.PI * index) / ordered.length
      const latOffset = (SPREAD_METERS * Math.sin(angle)) / METERS_PER_DEGREE_LAT
      const lngOffset =
        (SPREAD_METERS * Math.cos(angle)) /
        (METERS_PER_DEGREE_LAT * Math.max(0.01, Math.cos((shop.lat * Math.PI) / 180)))
      plotted.set(shop.catalogId, {
        shop,
        lat: shop.lat + latOffset,
        lng: shop.lng + lngOffset,
      })
    })
  }

  // Back in the API's nearest-first order, which is the only ranking it gives.
  return shops.map((shop) => plotted.get(shop.catalogId)!).filter(Boolean)
}
