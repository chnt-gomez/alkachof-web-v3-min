import { useState } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import type { CatalogLocation } from '../actions/fetchCatalogLocation'

function buildAddress(loc: CatalogLocation): string {
  const line1 = [loc.street_name, loc.number].filter(Boolean).join(' ')
  return [line1, loc.neighborhood, loc.city, loc.state].filter(Boolean).join(', ')
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  // iPadOS reports as MacIntel, so touch points disambiguate it from a desktop Mac.
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/**
 * Hand-off url for the device's own maps app. We deliberately do not pick a
 * navigation provider — Android's `geo:` shows the system app chooser, and Apple
 * Maps offers its own hand-off on iOS, so the destination stays the user's call.
 * iOS ignores `geo:` entirely, which is why the platform is branched on at all.
 */
function buildMapsHref(loc: CatalogLocation, label: string): string {
  const coords = `${loc.lat},${loc.lng}`
  const q = encodeURIComponent(label || 'Ubicación del catálogo')
  return isIOS()
    ? `https://maps.apple.com/?ll=${coords}&q=${q}`
    : `geo:${coords}?q=${coords}(${q})`
}

type Props = {
  location: CatalogLocation
  onClose: () => void
}

export function CatalogLocationDialog({ location, onClose }: Props) {
  const [staticMapFailed, setStaticMapFailed] = useState(false)

  const address = buildAddress(location)

  // Static (control-free) map image, zoomed in on the marker. If the static tile
  // service is unavailable, fall back to the interactive embed (controls disabled).
  const staticMapSrc = `https://staticmap.openstreetmap.de/staticmap.php?center=${location.lat},${location.lng}&zoom=17&size=640x480&maptype=mapnik&markers=${location.lat},${location.lng},lightblue1`

  const delta = 0.003
  const bbox = `${location.lng - delta},${location.lat - delta},${location.lng + delta},${location.lat + delta}`
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.lat},${location.lng}`

  return (
    <Dialog onClose={onClose} ariaLabel="Ubicación del catálogo" title="Ubicación">
      <div className="flex flex-col gap-4 p-5">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted">
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
        </div>

        {address && (
          <p className="flex items-start gap-1.5 text-sm text-foreground">
            <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
            {address}
          </p>
        )}

        <a
          href={buildMapsHref(location, address)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.97]"
        >
          <Navigation size={15} />
          Abrir en mi app de mapas
        </a>

        <p className="text-center text-xs text-muted-foreground">
          Se abrirá la aplicación de mapas de tu teléfono para que elijas cómo llegar.
        </p>
      </div>
    </Dialog>
  )
}
