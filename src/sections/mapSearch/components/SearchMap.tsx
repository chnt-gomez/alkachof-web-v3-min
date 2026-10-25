import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { shopIcon, USER_DOT_ICON } from '@/lib/mapIcons'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { formatDistance } from '@/lib/format'
import type { Coords } from '@/lib/geolocation'
import { INITIAL_ZOOM, MAX_ZOOM, MIN_ZOOM } from '../mapView'
import { plotShops } from '../plotShops'
import type { NearbyCatalog } from '../actions/lookupNearbyCatalogs'
import { publicCatalogName } from '@/lib/catalogName'

type FlyTarget = { coords: Coords; nonce: number } | null

type Props = {
  /** First frame only — Leaflet owns the viewport after mount. */
  center: Coords
  initialZoom: number
  /** Where the page wants the viewport; re-honored on every nonce. */
  flyTo: FlyTarget
  /** The viewer's position, once known. */
  userCoords: Coords | null
  /** Shops from the proximity lookup, in the API's nearest-first order. */
  shops: NearbyCatalog[]
  /** A tapped shop. Leaflet fires this on a tap, not on a drag that ends on a marker. */
  onOpenShop: (shop: NearbyCatalog) => void
  /** Called with the centre once a pan or zoom has *settled*. */
  onViewportSettled: (center: Coords) => void
}

/** The map itself: tiles, the viewer's dot, and the shops around them. */
export function SearchMap({
  center,
  initialZoom,
  flyTo,
  userCoords,
  shops,
  onOpenShop,
  onViewportSettled,
}: Props) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={initialZoom}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={MAX_ZOOM}
      />
      <FlyToTarget target={flyTo} />
      <ViewportWatcher onSettled={onViewportSettled} />
      {/* Drawn before the viewer's dot so "you are here" stays on top. */}
      {plotShops(shops).map(({ shop, lat, lng }) => (
        <Marker
          key={shop.catalogId}
          icon={shopIcon(resolveMediaUrl(shop.image))}
          position={[lat, lng]}
          /* The badge carries no text, so `title` is the whole accessible name —
             and the distance has nowhere else to be shown now that a tap opens
             the catalog directly. */
          title={`${publicCatalogName(shop.alias)}, ${formatDistance(shop.distanceMeters)}`}
          eventHandlers={{ click: () => onOpenShop(shop) }}
        />
      ))}
      {userCoords && (
        <Marker
          icon={USER_DOT_ICON}
          position={[userCoords.lat, userCoords.lng]}
          title="Tu ubicación"
        />
      )}
    </MapContainer>
  )
}

/**
 * Moves the viewport when the page asks, always to the opening zoom: recentering
 * from a zoomed-out pan should land back where the screen started, not keep a
 * zoom the user set while looking somewhere else. Renders nothing.
 */
function FlyToTarget({ target }: { target: FlyTarget }) {
  const map = useMap()

  useEffect(() => {
    if (target) map.flyTo([target.coords.lat, target.coords.lng], INITIAL_ZOOM)
  }, [target, map])

  return null
}

/**
 * Reports the centre once the map has *settled*.
 *
 * `moveend` fires once after a pan or a zoom finishes — not per frame — which is
 * what makes it safe to hang a network decision off it. The gate
 * (`useNearbyCatalogs`) still decides whether that centre is far enough from the
 * loaded circle to be worth a call.
 */
function ViewportWatcher({ onSettled }: { onSettled: (center: Coords) => void }) {
  useMapEvents({
    moveend(event) {
      const center = event.target.getCenter()
      onSettled({ lat: center.lat, lng: center.lng })
    },
  })

  return null
}
