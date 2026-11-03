import type { NotificationsState } from '@/sections/notifications/notificationsContextValue'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { SectionStatus } from '../hooks/useAsyncSection'
import type { News } from '../actions/fetchNews'
import type { NewestCatalogRow } from '../actions/fetchNewestCatalogs'
import { MyCatalogCard } from './MyCatalogCard'
import { NotificationList } from './NotificationList'
import { NewestCatalogList } from './NewestCatalogList'
import { NewsList } from './NewsList'
import { SectionSkeleton, SectionError } from './SectionState'
import { panelId } from '../homeTabs'

type Section<T> = {
  status: SectionStatus
  data: T | null
  reload: () => void
}

type Props = {
  myCatalog: Section<{ catalog: Catalog; itemCount: number }>
  notifications: NotificationsState
  news: Section<News[]>
  newestCatalogs: Section<NewestCatalogRow[]>
}

/**
 * The landing half of Home: the user's catalog, their notifications, the news,
 * then the newest shops on the platform.
 *
 * The showcase goes last because the three blocks above it are this user's own —
 * their shop, what happened to it, what they are being told — and it is the one
 * block here that belongs to nobody, which is also why its freshness is gated by
 * a stamp rather than by `useAsyncSection`. It is the floor of the panel Home
 * opens on: whatever else is empty, there is always somewhere to go from here.
 */
export function MisCosasPanel({ myCatalog, notifications, news, newestCatalogs }: Props) {
  return (
    <div
      id={panelId('mis-cosas')}
      role="tabpanel"
      aria-label="Mis cosas"
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-3" aria-labelledby="home-my-catalog">
        <h2 id="home-my-catalog" className="text-lg font-semibold">
          Mi catálogo
        </h2>
        {myCatalog.status === 'loading' && <SectionSkeleton label="Cargando tu catálogo" />}
        {myCatalog.status === 'error' && (
          <SectionError message="No pudimos cargar tu catálogo." onRetry={myCatalog.reload} />
        )}
        {myCatalog.status === 'ready' && myCatalog.data && (
          <MyCatalogCard catalog={myCatalog.data.catalog} itemCount={myCatalog.data.itemCount} />
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
        {notifications.status === 'ready' && (
          <NotificationList
            notifications={notifications.notifications}
            onSeen={notifications.markSeen}
            onDelete={notifications.remove}
          />
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="home-news">
        <h2 id="home-news" className="text-lg font-semibold">
          Noticias
        </h2>
        {news.status === 'loading' && <SectionSkeleton label="Cargando noticias" />}
        {news.status === 'error' && (
          <SectionError message="No pudimos cargar las noticias." onRetry={news.reload} />
        )}
        {news.status === 'ready' && news.data && <NewsList news={news.data} />}
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
