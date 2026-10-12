import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import type L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PIN_ICON } from '@/lib/mapIcons'
import { DEFAULT_CENTER, geolocationMessage, getDeviceLocation, type Coords } from '@/lib/geolocation'

// Re-exported for the dialog that drives this picker: the type belongs to the
// shared geolocation module, but importers shouldn't have to know that.
export type { Coords }

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

  async function handleUseMyLocation() {
    setLocating(true)
    setGeoError(null)
    const result = await getDeviceLocation()
    setLocating(false)
    if (!result.ok) {
      setGeoError(geolocationMessage(result.reason))
      return
    }
    onChange(result.coords)
    setFlyTo({ coords: result.coords, nonce: Date.now() })
  }

  const initialCenter = value ?? DEFAULT_CENTER

  return (
    <div className="flex flex-col gap-2">
      <div className="h-[40vh] max-h-64 min-h-48 overflow-hidden rounded-2xl border-2 border-ink border-border">
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
