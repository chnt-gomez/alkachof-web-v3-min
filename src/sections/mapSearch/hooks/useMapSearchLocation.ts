import { useCallback, useEffect, useState } from 'react'
import {
  getDeviceLocation,
  type Coords,
  type GeolocationFailure,
} from '@/lib/geolocation'
import { readLastLocation, saveLastLocation } from '@/lib/lastLocation'

export type LocationPhase = 'locating' | 'located' | GeolocationFailure

/**
 * The viewer's own position, asked for once on mount.
 *
 * `getCurrentPosition`, never `watchPosition`: a watch drains battery to move a
 * marker nobody asked to move, and the recenter button exists precisely so the
 * app does not track anyone continuously.
 *
 * The coordinates are not a cache entry — `queryKeys` is the closed list of
 * cached *API* reads, and a GPS fix is neither a read nor something a mutation
 * writes back — and they are not sent anywhere: no action exists to send them to
 * yet. The one thing that outlives the screen is the coarse `hint` cookie, so
 * the next cold start opens near the user instead of on the fallback centre
 * (`src/lib/lastLocation.ts`).
 */
export function useMapSearchLocation() {
  const [coords, setCoords] = useState<Coords | null>(null)
  /*
    Read once, before the first render, because Leaflet reads its `center` on
    the first frame only — a hint that arrives in an effect arrives too late.

    It deliberately does **not** seed `coords`: the blue dot means "you are
    here", and drawing it on a remembered position would assert a fix we do not
    have. It is where the map looks, not where the user is.
  */
  const [hint] = useState<Coords | null>(() => readLastLocation())
  const [phase, setPhase] = useState<LocationPhase>('locating')
  // A fly target the map's controller reacts to. The nonce forces a fly even
  // when the same coordinates are requested twice — a user who pans away and
  // taps recenter twice must fly twice.
  const [flyTo, setFlyTo] = useState<{ coords: Coords; nonce: number } | null>(null)

  const locate = useCallback(async () => {
    setPhase('locating')
    const result = await getDeviceLocation()
    if (!result.ok) {
      setPhase(result.reason)
      return
    }
    setCoords(result.coords)
    setPhase('located')
    setFlyTo({ coords: result.coords, nonce: Date.now() })
    // A real fix, and the only thing ever remembered.
    saveLastLocation(result.coords)
  }, [])

  useEffect(() => {
    void locate()
  }, [locate])

  /**
   * Back to me. With a position in hand this is a pure map move — no permission
   * prompt and no network. Without one it asks again, which is the only way back
   * for someone who tapped "block" by reflex.
   */
  const recenter = useCallback(() => {
    if (coords) {
      setFlyTo({ coords, nonce: Date.now() })
      return
    }
    void locate()
  }, [coords, locate])

  return { coords, hint, phase, flyTo, recenter, retry: locate }
}
