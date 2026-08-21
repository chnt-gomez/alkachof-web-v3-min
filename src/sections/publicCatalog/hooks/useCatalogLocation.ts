import { useEffect, useState } from 'react'
import { fetchCatalogLocation, type CatalogLocation } from '../actions/fetchCatalogLocation'

function hasValidCoords(loc: CatalogLocation): boolean {
  return (
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng) &&
    loc.lat >= -90 &&
    loc.lat <= 90 &&
    loc.lng >= -180 &&
    loc.lng <= 180
  )
}

/**
 * The catalog's location, or `null` when there is none, the fetch failed, or the
 * stored coordinates are unusable. Callers use the null case to hide the map
 * affordance entirely, so a visitor never opens an empty map.
 */
export function useCatalogLocation(catalogId: string | undefined): CatalogLocation | null {
  const [location, setLocation] = useState<CatalogLocation | null>(null)

  useEffect(() => {
    if (!catalogId) return
    let active = true
    setLocation(null)
    fetchCatalogLocation(catalogId)
      .then((loc) => {
        if (active) setLocation(loc && hasValidCoords(loc) ? loc : null)
      })
      .catch(() => {
        // No location is a normal state, not an error worth surfacing.
      })
    return () => {
      active = false
    }
  }, [catalogId])

  return location
}
