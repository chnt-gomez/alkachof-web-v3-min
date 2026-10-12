import { Link } from 'react-router-dom'
import { ChevronRight, Map } from 'lucide-react'

/**
 * The doorway from Comprar into the map (`/map`).
 *
 * Rendered unconditionally and never gated on the saved-catalog list's status: a
 * user with zero subscriptions is exactly the user who needs this card, and
 * putting it behind that list's spinner would hide it from them for the length of
 * a mobile-data round trip.
 *
 * Shaped like `MyCatalogCard` but tiled in the buy signature color, so it reads
 * as belonging to this half of Home. It has no data to summarise, hence no count
 * line and no empty state.
 */
export function MapSearchCard() {
  return (
    <Link
      to="/map"
      aria-label="Buscar catálogos en el mapa"
      className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-card p-4 transition-[box-shadow,transform]"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-buy text-buy-ink">
        <Map size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-semibold">Buscar catálogos</span>
        <span className="text-sm text-muted-foreground">
          Busca catálogos cerca de ti con el mapa
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </Link>
  )
}
