import { useEffect, useState } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import { fetchCatalogLocation, type CatalogLocation } from '../actions/fetchCatalogLocation'

/** Great-circle distance between two coordinates, in kilometers. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toLocaleString('es-MX', { maximumFractionDigits: 1 })} km`
}

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

function buildAddress(loc: CatalogLocation): string {
  const line1 = [loc.street_name, loc.number].filter(Boolean).join(' ')
  return [line1, loc.neighborhood, loc.city, loc.state].filter(Boolean).join(', ')
}

export function CatalogLocationCard({ catalogId }: { catalogId: string }) {
  const [location, setLocation] = useState<CatalogLocation | null>(null)
  const [failed, setFailed] = useState(false)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [staticMapFailed, setStaticMapFailed] = useState(false)

  useEffect(() => {
    let active = true
    setFailed(false)
    setLocation(null)
    fetchCatalogLocation(catalogId)
      .then((loc) => {
        if (active) setLocation(loc)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [catalogId])

  useEffect(() => {
    if (!location || !hasValidCoords(location)) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    let active = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (active) {
          setDistanceKm(
            haversineKm(pos.coords.latitude, pos.coords.longitude, location.lat, location.lng),
          )
        }
      },
      () => {
        // Permission denied / unavailable — the card still shows the map, just no distance.
      },
      { timeout: 8000, maximumAge: 300_000 },
    )
    return () => {
      active = false
    }
  }, [location])

  // No location, a failed fetch, or bad coordinates → the card is not drawn.
  if (failed || !location || !hasValidCoords(location)) return null

  const address = buildAddress(location)

  // Static (control-free) map image, zoomed in on the marker. If the static tile
  // service is unavailable, fall back to the interactive embed (controls disabled).
  const staticMapSrc = `https://staticmap.openstreetmap.de/staticmap.php?center=${location.lat},${location.lng}&zoom=17&size=640x400&maptype=mapnik&markers=${location.lat},${location.lng},lightblue1`

  const delta = 0.003
  const bbox = `${location.lng - delta},${location.lat - delta},${location.lng + delta},${location.lat + delta}`
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.lat},${location.lng}`

  // Hand off to the device's default map application on tap.
  const geoLabel = encodeURIComponent(address || 'Ubicación del catálogo')
  const geoHref = `geo:${location.lat},${location.lng}?q=${location.lat},${location.lng}(${geoLabel})`

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <a
        href={geoHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Abrir la ubicación en tu aplicación de mapas"
        className="relative block h-64"
      >
        {staticMapFailed ? (
          <iframe
            title="Mapa de la ubicación del catálogo"
            src={embedSrc}
            loading="lazy"
            className="pointer-events-none h-full w-full border-0"
          />
        ) : (
          <img
            src={staticMapSrc}
            onError={() => setStaticMapFailed(true)}
            alt="Mapa de la ubicación del catálogo"
            className="h-full w-full object-cover"
          />
        )}
        {/* Transparent overlay guarantees the tap targets the link, even over the iframe. */}
        <span aria-hidden="true" className="absolute inset-0" />
      </a>

      {(address || distanceKm !== null) && (
        <div className="flex flex-col gap-1 px-3 py-2">
          {address && (
            <p className="flex items-start gap-1.5 text-sm text-card-foreground">
              <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
              {address}
            </p>
          )}
          {distanceKm !== null && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Navigation size={13} className="shrink-0 text-primary" />
              A {formatDistance(distanceKm)} de tu ubicación
            </p>
          )}
        </div>
      )}
    </section>
  )
}
