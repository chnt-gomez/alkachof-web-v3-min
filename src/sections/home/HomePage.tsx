import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'
import { fetchCatalogItems } from '@/sections/catalog/actions/fetchCatalogItems'
import { fetchNotifications } from './actions/fetchNotifications'
import { fetchSavedCatalogs } from './actions/fetchSavedCatalogs'
import { useAsyncSection } from './hooks/useAsyncSection'
import { MyCatalogCard } from './components/MyCatalogCard'
import { NotificationList } from './components/NotificationList'
import { SavedCatalogList } from './components/SavedCatalogList'

export function HomePage() {
  const loadMyCatalog = useCallback(async () => {
    const catalog = await fetchMyCatalog()
    const items = await fetchCatalogItems(catalog._id)
    return { catalog, hasProducts: items.length > 0 }
  }, [])

  const myCatalog = useAsyncSection(loadMyCatalog)
  const notifications = useAsyncSection(useCallback(() => fetchNotifications(), []))
  const savedCatalogs = useAsyncSection(useCallback(() => fetchSavedCatalogs(), []))

  return (
    <div className="flex flex-col gap-6 p-5">
      <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>

      <section className="flex flex-col gap-3" aria-labelledby="home-my-catalog">
        <h2 id="home-my-catalog" className="text-lg font-semibold">
          Mi catálogo
        </h2>
        {myCatalog.status === 'loading' && <SectionSkeleton label="Cargando tu catálogo" />}
        {myCatalog.status === 'error' && (
          <SectionError message="No pudimos cargar tu catálogo." onRetry={myCatalog.reload} />
        )}
        {myCatalog.status === 'ready' && myCatalog.data && (
          <MyCatalogCard catalog={myCatalog.data.catalog} hasProducts={myCatalog.data.hasProducts} />
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="home-notifications">
        <h2 id="home-notifications" className="text-lg font-semibold">
          Notificaciones
        </h2>
        {notifications.status === 'loading' && <SectionSkeleton label="Cargando notificaciones" />}
        {notifications.status === 'error' && (
          <SectionError
            message="No pudimos cargar tus notificaciones."
            onRetry={notifications.reload}
          />
        )}
        {notifications.status === 'ready' && notifications.data && (
          <NotificationList notifications={notifications.data} />
        )}
      </section>

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

function SectionSkeleton({ label }: { label: string }) {
  return (
    <div
      className="h-24 animate-pulse rounded-2xl bg-muted"
      aria-busy="true"
      aria-label={label}
    />
  )
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4"
    >
      <p className="text-sm text-destructive">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}
