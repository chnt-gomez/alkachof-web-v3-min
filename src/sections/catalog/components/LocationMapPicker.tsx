import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Leaflet's default icon relies on bundled PNGs that don't resolve reliably under
// Vite, leaving the marker invisible. A CSS-only div icon always renders.
const PIN_ICON = L.divIcon({
  // `leaflet-div-icon` (the default) draws a white box/border — an empty className
  // drops it so only our styled dot shows.
  className: '',
  html:
    '<span style="display:block;width:20px;height:20px;border-radius:9999px;' +
    'background:#166534;border:3px solid #ffffff;box-shadow:0 0 0 1px rgba(0,0,0,0.35)"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

export type Coords = { lat: number; lng: number }

// Ciudad de México — a sensible fallback center before the user picks a point.
const DEFAULT_CENTER: Coords = { lat: 19.4326, lng: -99.1332 }
const OVERVIEW_ZOOM = 12
const PIN_ZOOM = 16

type Props = {
  value: Coords | null
  onChange: (coords: Coords) => void
}

/**
 * Interactive location picker. The device coordinates are captured through the
 * map only — a "use my location" button drops the marker, and tapping or
 * dragging on the map fine-tunes it. `lat`/`lng` are never shown to the user.
 */
export function LocationMapPicker({ value, onChange }: Props) {
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  // A fly target the map controller reacts to; the nonce forces a fly even when
  // the same coordinates are requested twice.
  const [flyTo, setFlyTo] = useState<{ coords: Coords; nonce: number } | null>(null)

  function handleUseMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Tu dispositivo no permite obtener la ubicación.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        onChange(coords)
        setFlyTo({ coords, nonce: Date.now() })
        setLocating(false)
      },
      () => {
        setGeoError('No pudimos obtener tu ubicación. Revisa los permisos e inténtalo de nuevo.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const initialCenter = value ?? DEFAULT_CENTER

  return (
    <div className="flex flex-col gap-2">
      <div className="h-[40vh] max-h-64 min-h-48 overflow-hidden rounded-2xl border border-border">
        <MapContainer
          center={[initialCenter.lat, initialCenter.lng]}
          zoom={value ? PIN_ZOOM : OVERVIEW_ZOOM}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController onPick={onChange} flyTo={flyTo} />
          {value && <DraggableMarker value={value} onChange={onChange} />}
        </MapContainer>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={handleUseMyLocation} disabled={locating}>
        <Navigation size={14} />
        {locating ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Toca el mapa o arrastra el marcador para ajustar la ubicación exacta.
      </p>

      {geoError && (
        <p role="alert" className="text-xs text-destructive">
          {geoError}
        </p>
      )}
    </div>
  )
}

/** Handles map taps (set marker) and flies to a requested target. */
function MapController({
  onPick,
  flyTo,
}: {
  onPick: (coords: Coords) => void
  flyTo: { coords: Coords; nonce: number } | null
}) {
  const map = useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })

  useEffect(() => {
    if (flyTo) map.flyTo([flyTo.coords.lat, flyTo.coords.lng], PIN_ZOOM)
  }, [flyTo, map])

  return null
}

/** A draggable marker that reports its new position when dropped. */
function DraggableMarker({ value, onChange }: { value: Coords; onChange: (coords: Coords) => void }) {
  const ref = useRef<L.Marker>(null)
  const handlers = useMemo(
    () => ({
      dragend() {
        const marker = ref.current
        if (!marker) return
        const pos = marker.getLatLng()
        onChange({ lat: pos.lat, lng: pos.lng })
      },
    }),
    [onChange],
  )

  return (
    <Marker ref={ref} draggable icon={PIN_ICON} eventHandlers={handlers} position={[value.lat, value.lng]} />
  )
}
