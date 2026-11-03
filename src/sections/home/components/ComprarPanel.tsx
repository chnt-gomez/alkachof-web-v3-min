import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { SectionStatus } from '../hooks/useAsyncSection'
import { MapSearchCard } from './MapSearchCard'
import { SavedCatalogList } from './SavedCatalogList'
import { SectionSkeleton, SectionError } from './SectionState'
import { panelId } from '../homeTabs'

type Section<T> = {
  status: SectionStatus
  data: T | null
  reload: () => void
}

type Props = {
  savedCatalogs: Section<Catalog[]>
}

/**
 * The buy half of Home: the doorway into map discovery, then the catalogs the
 * user already follows.
 *
 * Both blocks are about this user — one is where they are, the other is who
 * they follow. The platform-wide showcase lives on *Mis cosas*, the panel Home
 * opens on.
 */
export function ComprarPanel({ savedCatalogs }: Props) {
  return (
    <div
      id={panelId('comprar')}
      role="tabpanel"
      aria-label="Comprar"
      className="flex flex-col gap-6"
    >
      <MapSearchCard />

      <section className="flex flex-col gap-3" aria-labelledby="home-saved-catalogs">
        <h2 id="home-saved-catalogs" className="text-lg font-semibold">
          Catálogos guardados
        </h2>
        {savedCatalogs.status === 'loading' && (
          <SectionSkeleton label="Cargando catálogos guardados" />
        )}
        {savedCatalogs.status === 'error' && (
          <SectionError
            message="No pudimos cargar tus catálogos guardados."
            onRetry={savedCatalogs.reload}
          />
        )}
        {savedCatalogs.status === 'ready' && savedCatalogs.data && (
          <SavedCatalogList catalogs={savedCatalogs.data} />
        )}
      </section>
    </div>
  )
}
