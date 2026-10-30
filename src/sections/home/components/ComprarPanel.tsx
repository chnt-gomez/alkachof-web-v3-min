import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { SectionStatus } from '../hooks/useAsyncSection'
import type { NewestCatalogRow } from '../actions/fetchNewestCatalogs'
import { MapSearchCard } from './MapSearchCard'
import { SavedCatalogList } from './SavedCatalogList'
import { NewestCatalogList } from './NewestCatalogList'
import { SectionSkeleton, SectionError } from './SectionState'
import { panelId } from '../homeTabs'

type Section<T> = {
  status: SectionStatus
  data: T | null
  reload: () => void
}

type Props = {
  savedCatalogs: Section<Catalog[]>
  newestCatalogs: Section<NewestCatalogRow[]>
}

/**
 * The buy half of Home: the doorway into map discovery, then the catalogs the
 * user already follows, then the newest shops on the platform.
 *
 * The showcase goes last because the first two blocks are about this user — one
 * is where they are, the other is who they follow — and it is the only block
 * here that always has something in it. A user with no subscriptions and an
 * empty circle on the map still has somewhere to go.
 */
export function ComprarPanel({ savedCatalogs, newestCatalogs }: Props) {
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

      <section className="flex flex-col gap-3" aria-labelledby="home-newest-catalogs">
        <div className="flex flex-col gap-0.5">
          <h2 id="home-newest-catalogs" className="text-lg font-semibold">
            Catálogos nuevos
          </h2>
          <p className="text-sm text-muted-foreground">
            Las tiendas más recientes en Alkachof
          </p>
        </div>
        {newestCatalogs.status === 'loading' && (
          <SectionSkeleton label="Cargando catálogos nuevos" />
        )}
        {newestCatalogs.status === 'error' && (
          <SectionError
            message="No pudimos cargar los catálogos nuevos."
            onRetry={newestCatalogs.reload}
          />
        )}
        {newestCatalogs.status === 'ready' && newestCatalogs.data && (
          <NewestCatalogList catalogs={newestCatalogs.data} />
        )}
      </section>
    </div>
  )
}
