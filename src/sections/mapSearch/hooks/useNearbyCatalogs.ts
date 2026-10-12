import { useCallback, useEffect, useRef, useState } from 'react'
import { distanceBetween, isValidCoords, type Coords } from '@/lib/geolocation'
import {
  DEFAULT_RADIUS_METERS,
  lookupNearbyCatalogs,
  type NearbyCatalog,
} from '../actions/lookupNearbyCatalogs'

/**
 * One lookup per *circle*, not per drag.
 *
 * A call returns every located catalog within `radiusMeters` of the point it was
 * made at — the **starting point**, `P`. While the map stays inside that circle
 * the markers are already in memory and panning costs nothing. When the map's
 * centre leaves it, that is the first moment the screen could be showing an
 * empty edge, so a new circle is fetched at the new centre.
 */

/**
 * How far from `P` the map may travel before a new circle is fetched, as a
 * fraction of the radius the **server echoed** (never a local copy of 7000 — the
 * server clamps, and `radiusMeters` is what actually applied).
 *
 * `1` means: refetch exactly when the centre leaves the loaded circle. The
 * trade-off to know about is that at that moment the far half of the viewport is
 * already outside the loaded area, so a user panning steadily sees a thinning
 * edge for the second the request takes. A fraction (the API's handover suggests
 * 0.6–0.7) refetches earlier and keeps a loaded margin around the viewport, at
 * the cost of more calls. One constant, if that trade is ever re-made.
 */
const REFETCH_AT_FRACTION = 1

/**
 * The client's own floor between lookups.
 *
 * The server allows 6 per 60 s per IP, which is a different shape on purpose:
 * Mexican carriers run CGNAT, so many real users share one address and a fast
 * drag can legitimately cross two circles inside ten seconds. This 10 s rule is
 * what governs normal use; the server budget is there so a bug cannot bypass it.
 */
const MIN_CALL_INTERVAL_MS = 10_000

/** Used only when a 429 arrives without `availableAt`. */
const RATE_LIMIT_FALLBACK_MS = 60_000

export type NearbyStatus =
  /** No position yet, so nothing has been asked. */
  | 'idle'
  /** First lookup in flight — there is nothing on the map yet. */
  | 'loading'
  /** Results in hand (possibly zero, which is a valid answer). */
  | 'ready'
  /** The first lookup failed and there is nothing to show. */
  | 'error'
  /** 404: proximity search is off on this deployment. Terminal. */
  | 'unavailable'

type Gate = {
  /** `P` — the point the results in hand were fetched at. */
  origin: Coords | null
  /** The radius the server said applied at `P`. */
  radius: number
  lastCallAt: number
  /** Set by a 429: nothing may be sent before this. */
  blockedUntil: number
  timer: ReturnType<typeof setTimeout> | null
  /** A point that wants a lookup as soon as the throttle allows. */
  pending: Coords | null
  /** Discards a response that a newer request has already superseded. */
  epoch: number
  /** The last point actually sent, for the retry button. */
  lastPoint: Coords | null
  /** A 200 has landed at least once. */
  loaded: boolean
  /** 404 — stop asking, for good. */
  off: boolean
  alive: boolean
}

function needsLookup(gate: Gate, at: Coords): boolean {
  if (!gate.origin) return true
  return distanceBetween(gate.origin, at) >= gate.radius * REFETCH_AT_FRACTION
}

export function useNearbyCatalogs() {
  const [shops, setShops] = useState<NearbyCatalog[]>([])
  const [status, setStatus] = useState<NearbyStatus>('idle')
  /** More inside the circle than came back. The only completeness signal. */
  const [truncated, setTruncated] = useState(false)
  /** A refresh was refused or failed while results were already on screen. */
  const [stale, setStale] = useState(false)

  const gateRef = useRef<Gate>({
    origin: null,
    radius: DEFAULT_RADIUS_METERS,
    lastCallAt: 0,
    blockedUntil: 0,
    timer: null,
    pending: null,
    epoch: 0,
    lastPoint: null,
    loaded: false,
    off: false,
    alive: true,
  })

  useEffect(() => {
    const gate = gateRef.current
    gate.alive = true
    return () => {
      gate.alive = false
      if (gate.timer) clearTimeout(gate.timer)
      gate.timer = null
    }
  }, [])

  const run = useCallback(async (at: Coords) => {
    const gate = gateRef.current
    gate.lastCallAt = Date.now()
    gate.lastPoint = at
    const epoch = ++gate.epoch
    if (!gate.loaded) setStatus('loading')

    const result = await lookupNearbyCatalogs(at)
    // A newer request won, or the screen is gone: an older circle must not
    // overwrite a newer one.
    if (!gate.alive || epoch !== gate.epoch) return

    if (result.ok) {
      gate.origin = at
      gate.radius = result.radiusMeters
      gate.loaded = true
      setShops(result.results)
      setTruncated(result.truncated)
      setStale(false)
      setStatus('ready')
      return
    }

    if (result.reason === 'unavailable') {
      gate.off = true
      setStatus('unavailable')
      return
    }

    if (result.reason === 'rateLimited') {
      const resumeAt = result.availableAt ? Date.parse(result.availableAt) : NaN
      gate.blockedUntil = Number.isFinite(resumeAt)
        ? resumeAt
        : Date.now() + RATE_LIMIT_FALLBACK_MS
    }

    /*
      A refused or failed refresh is **not** an error state when something is
      already drawn: the whole design is that a 7 km circle is in hand, so the
      map is slightly stale rather than broken. `P` is deliberately left where it
      was, so the next pan past it asks again.
    */
    setStale(gate.loaded)
    setStatus(gate.loaded ? 'ready' : 'error')
  }, [])

  /**
   * Offers a point to the gate. Everything funnels through here — the first fix,
   * every settled viewport, and a re-locate — so the distance rule and the
   * throttle are applied in exactly one place.
   */
  const consider = useCallback(
    (at: Coords) => {
      const gate = gateRef.current
      if (gate.off || !gate.alive) return
      // A malformed point would spend one of six calls a minute on a 400.
      if (!isValidCoords(at.lat, at.lng)) return
      if (!needsLookup(gate, at)) {
        /*
          Inside the circle, so nothing to fetch — and this *supersedes* any
          point still queued behind the throttle. Without this, a user who pans
          out of the circle and straight back in pays for a lookup of where they
          briefly were, ten seconds after they left.
        */
        gate.pending = null
        return
      }

      const readyAt = Math.max(gate.lastCallAt + MIN_CALL_INTERVAL_MS, gate.blockedUntil)
      const wait = readyAt - Date.now()
      if (wait <= 0) {
        void run(at)
        return
      }

      /*
        Deferred, never dropped. The map is already outside the circle it is
        drawing from, and nothing else will ask again until the user moves — so
        dropping this would leave the screen stale until they happened to pan
        once more. The timer re-checks the distance when it fires, because by
        then the user may have panned back inside.
      */
      gate.pending = at
      if (gate.timer) return
      gate.timer = setTimeout(() => {
        gate.timer = null
        const next = gate.pending
        gate.pending = null
        if (next && gate.alive && !gate.off && needsLookup(gate, next)) void run(next)
      }, wait)
    },
    [run],
  )

  /** For the "nothing came back" error state. Honors the throttle like any call. */
  const retry = useCallback(() => {
    const gate = gateRef.current
    if (gate.lastPoint) consider(gate.lastPoint)
  }, [consider])

  return { shops, status, truncated, stale, consider, retry }
}
