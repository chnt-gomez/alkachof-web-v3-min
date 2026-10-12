import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { SectionStatus } from '../hooks/useAsyncSection'
import { MapSearchCard } from './MapSearchCard'
import { SavedCatalogList } from './SavedCatalogList'
import { SectionSkeleton, SectionError } from './SectionState'
import { panelId } from '../homeTabs'

type Props = {
  savedCatalogs: {
    status: SectionStatus
    data: Catalog[] | null
    reload: () => void
  }
}

/**
 * The buy half of Home: the doorway into map discovery, then the catalogs the
 * user already follows.
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
