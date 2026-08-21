import type { NotificationsState } from '@/sections/notifications/notificationsContextValue'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { SectionStatus } from '../hooks/useAsyncSection'
import type { AdminMessage } from '../actions/fetchNews'
import { MyCatalogCard } from './MyCatalogCard'
import { NotificationList } from './NotificationList'
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
  news: Section<AdminMessage[]>
}

/** The seller's own half of Home: their catalog, their notifications, the news. */
export function MisCosasPanel({ myCatalog, notifications, news }: Props) {
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
    </div>
  )
}
