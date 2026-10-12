import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DEFAULT_CENTER, geolocationMessage } from '@/lib/geolocation'
import { MapSearchBar } from './components/MapSearchBar'
import { RecenterButton } from './components/RecenterButton'
import { SearchMap } from './components/SearchMap'
import { useMapSearchLocation, type LocationPhase } from './hooks/useMapSearchLocation'
import { useNearbyCatalogs, type NearbyStatus } from './hooks/useNearbyCatalogs'
import { INITIAL_ZOOM, MIN_ZOOM } from './mapView'
import type { NearbyCatalog } from './actions/lookupNearbyCatalogs'

/**
 * Full-screen map of the catalogs around the user.
 *
 * Rendered **outside `NavShell`** (its own back button replaces the bottom tabs):
 * the shell's `pb-24` would cover the bottom of the map — where the recenter
 * button and the result card go — and its fixed tab bar would sit on top of
 * Leaflet's attribution.
 *
 * The position comes first and the lookup follows it: `useMapSearchLocation`
 * owns the fix, `useNearbyCatalogs` owns one circle of results and decides when
 * the map has travelled far enough from that circle to deserve another.
 * Contract: `followup.LocationSearchApi.md`.
 */
export function MapSearchPage() {
  const { coords, hint, phase, flyTo, recenter, retry: retryLocation } = useMapSearchLocation()
  const {
    shops,
    status: lookupStatus,
    truncated,
    stale,
    consider,
    retry: retryLookup,
  } = useNearbyCatalogs()
  const navigate = useNavigate()
  // Lifted even though the field is inert, so wiring a real query is a change
  // inside this file only.
  const [query, setQuery] = useState('')

  /*
    A tapped shop goes straight to its public catalog — the shop's own page
    already carries its image, its description and its items, so an intermediate
    card on the map would be a second, thinner copy of it. Client-side
    navigation, so coming back lands on the map with its circle still in hand.
  */
  const openShop = useCallback(
    (shop: NearbyCatalog) => navigate(`/catalog/${shop.catalogId}`),
    [navigate],
  )

  // The first circle is fetched at the user's own position. Every later one
  // comes from a settled viewport; both go through the same gate.
  useEffect(() => {
    if (coords) consider(coords)
  }, [coords, consider])

  return (
    <div className="flex h-dvh flex-col">
      <header className="z-20 shrink-0 border-b-2 border-ink bg-card">
        <div className="flex items-center gap-2 px-3 pt-2.5">
          {/* A link, not `navigate(-1)`: this screen is reachable by url and by
              reload, and both must land somewhere sensible. */}
          <Link
            to="/?tab=comprar"
            aria-label="Volver"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft size={22} />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg">Buscar catálogos</h1>
        </div>
        <div className="px-4 pb-3 pt-1">
          <MapSearchBar value={query} onChange={setQuery} enabled={false} />
        </div>
      </header>

      {/* `min-h-0` is load-bearing: Leaflet sizes itself to its container, and a
          flex child without it grows to its content instead of to the viewport. */}
      <div className="relative min-h-0 flex-1">
        {/*
          The first frame: the position remembered from last time if there is
          one, otherwise the fallback centre pulled right out to `MIN_ZOOM` —
          opening tight on a city the user may be nowhere near would be a
          confident guess, and the overview is the honest one. A remembered
          position has been right before, so it opens at the normal zoom and the
          incoming fix becomes a short pan instead of a flight across a country.
        */}
        <SearchMap
          center={hint ?? DEFAULT_CENTER}
          initialZoom={hint ? INITIAL_ZOOM : MIN_ZOOM}
          flyTo={flyTo}
          userCoords={coords}
          shops={shops}
          onOpenShop={openShop}
          onViewportSettled={consider}
        />

        <MapNotice
          phase={phase}
          onRetryLocation={retryLocation}
          lookupStatus={lookupStatus}
          shopCount={shops.length}
          truncated={truncated}
          stale={stale}
          onRetryLookup={retryLookup}
        />

        {/* Clear of Leaflet's attribution strip and the phone's home bar. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-end px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <RecenterButton onClick={recenter} busy={phase === 'locating'} />
        </div>
      </div>
    </div>
  )
}

function shopCountLabel(count: number, truncated: boolean): string {
  // `results.length`, never `total` — that counts rows the API deliberately
  // withheld (banned or unverified sellers), so it would overstate the map.
  // `truncated` is the only honest "there is more".
  const noun = count === 1 ? 'catálogo cerca' : 'catálogos cerca'
  return truncated ? `Más de ${count} ${noun}` : `${count} ${noun}`
}

type NoticeProps = {
  phase: LocationPhase
  onRetryLocation: () => void
  lookupStatus: NearbyStatus
  /** `results.length`, never the API's `total`. See `shopCountLabel`. */
  shopCount: number
  truncated: boolean
  stale: boolean
  onRetryLookup: () => void
}

/**
 * The one line of state over the map, and never two at once.
 *
 * Location comes first because the lookup depends on it: with no fix there is no
 * point to search around, so those states are mutually exclusive in practice
 * rather than by arbitration. Floated over the map, never a dialog and never a
 * page-level error — an empty map someone can pan is more useful than a spinner.
 */
function MapNotice({
  phase,
  onRetryLocation,
  lookupStatus,
  shopCount,
  truncated,
  stale,
  onRetryLookup,
}: NoticeProps) {
  const frame =
    'absolute inset-x-4 top-3 z-20 rounded-xl border-2 border-ink bg-card px-3 py-2 text-xs'

  if (phase === 'locating') {
    return (
      <p role="status" className={`${frame} text-muted-foreground`}>
        Obteniendo tu ubicación…
      </p>
    )
  }

  if (phase !== 'located') {
    return (
      <div role="alert" className={`${frame} flex flex-col items-start gap-2`}>
        <p className="text-foreground">{geolocationMessage(phase)}</p>
        {/* `unsupported` is terminal: a button that cannot change its own
            outcome is worse than no button. */}
        {phase === 'denied' && (
          <Button size="sm" variant="outline" onClick={onRetryLocation}>
            Reintentar
          </Button>
        )}
      </div>
    )
  }

  switch (lookupStatus) {
    case 'idle':
      return null
    case 'loading':
      return (
        <p role="status" className={`${frame} text-muted-foreground`}>
          Buscando catálogos cerca…
        </p>
      )
    /* 404: the deployment has proximity search switched off. Say so once and
       never ask again — there is nothing for the user to retry. */
    case 'unavailable':
      return (
        <p className={`${frame} text-muted-foreground`}>
          La búsqueda de catálogos cercanos no está disponible por ahora.
        </p>
      )
    case 'error':
      return (
        <div role="alert" className={`${frame} flex flex-col items-start gap-2`}>
          <p className="text-foreground">No pudimos buscar catálogos cerca de ti.</p>
          <Button size="sm" variant="outline" onClick={onRetryLookup}>
            Reintentar
          </Button>
        </div>
      )
    case 'ready':
      // An empty circle is a valid answer, not a failure.
      return (
        <p role="status" className={`${frame} text-foreground`}>
          {shopCount === 0
            ? 'No encontramos catálogos cerca de aquí.'
            : shopCountLabel(shopCount, truncated)}
          {/* A refused or failed refresh while results are on screen: the map is
              slightly stale, not broken. */}
          {stale && <span className="text-muted-foreground"> · sin actualizar</span>}
        </p>
      )
  }
}
