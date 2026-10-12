import { describe, expect, it } from 'vitest'
import { distanceBetween } from '@/lib/geolocation'
import { plotShops } from '../plotShops'
import type { NearbyCatalog } from '../actions/lookupNearbyCatalogs'

const shop = (catalogId: string, lat: number, lng: number): NearbyCatalog => ({
  catalogId,
  alias: catalogId,
  lat,
  lng,
  city: 'Ciudad de México',
  neighborhood: 'Centro',
  distanceMeters: 100,
})

describe('plotShops', () => {
  it('leaves a lone shop exactly where the api put it', () => {
    const [plotted] = plotShops([shop('a', 19.433, -99.133)])

    expect(plotted).toMatchObject({ lat: 19.433, lng: -99.133 })
  })

  // The api snaps to a ~110 m grid, so two shops in one block share a point and
  // the marker underneath would be unreachable.
  it('separates shops that share a point', () => {
    const plotted = plotShops([shop('a', 19.433, -99.133), shop('b', 19.433, -99.133)])

    expect([plotted[0].lat, plotted[0].lng]).not.toEqual([plotted[1].lat, plotted[1].lng])
    const apart = distanceBetween(
      { lat: plotted[0].lat, lng: plotted[0].lng },
      { lat: plotted[1].lat, lng: plotted[1].lng },
    )
    // Visibly apart, but well inside the grid cell the api already rounded to.
    expect(apart).toBeGreaterThan(10)
    expect(apart).toBeLessThan(110)
  })

  it('plots the same response identically every time', () => {
    const shops = [shop('b', 19.433, -99.133), shop('a', 19.433, -99.133)]

    expect(plotShops(shops)).toEqual(plotShops([...shops]))
  })

  it('keeps every shop and the api nearest-first order', () => {
    const shops = [shop('a', 19.433, -99.133), shop('b', 19.433, -99.133), shop('c', 19.5, -99.2)]

    // Two shops on one point are two shops: `catalogId` is the identity.
    expect(plotShops(shops).map((p) => p.shop.catalogId)).toEqual(['a', 'b', 'c'])
  })
})
