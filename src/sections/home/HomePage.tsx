import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalogItems, useMyCatalog } from '@/sections/catalogs/hooks/useOwnerCatalog'
import { useNotifications } from '@/sections/notifications/useNotifications'
import { fetchSavedCatalogs } from './actions/fetchSavedCatalogs'
import { fetchNews } from './actions/fetchNews'
import { useAsyncSection, type SectionStatus } from './hooks/useAsyncSection'
import { readTab, type HomeTab } from './homeTabs'
import { HomeTabs } from './components/HomeTabs'
import { MisCosasPanel } from './components/MisCosasPanel'
import { ComprarPanel } from './components/ComprarPanel'

export function HomePage() {
  // The URL owns the active tab so the header bell (which links to "/") lands on
  // Mis cosas, and back/forward move between tabs.
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = readTab(searchParams.get('tab'))

  // A tab loads on first open and stays loaded, so switching back and forth
  // never re-hits the network. Deep-linking straight to Comprar leaves Mis cosas
  // unloaded until it is opened.
  const [opened, setOpened] = useState<Record<HomeTab, boolean>>(() => ({
    'mis-cosas': tab === 'mis-cosas',
    comprar: tab === 'comprar',
  }))

  useEffect(() => {
    setOpened((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }))
  }, [tab])

  /*
    The catalog tile reads the *shared* cache entries rather than fetching for
    itself, so it costs nothing once the catalog editor has been open — and vice
    versa. It used to load both resources independently, which is why bouncing
    between Inicio and Catálogo re-read a catalog that had not changed.

    `opened` still gates it: a tab the user has never opened fetches nothing.
  */
  const misCosasOpen = opened['mis-cosas']
  const catalogQuery = useMyCatalog(misCosasOpen)
  const itemsQuery = useCatalogItems(catalogQuery.data?._id, misCosasOpen)

  const myCatalog = useMemo(() => {
    const data =
      catalogQuery.data && itemsQuery.data
        ? { catalog: catalogQuery.data, itemCount: itemsQuery.data.length }
        : null
    // An unopened tab is `idle`, not `loading` — it has not been asked for.
    const status: SectionStatus = !misCosasOpen
      ? 'idle'
      : catalogQuery.isError || itemsQuery.isError
        ? 'error'
        : data
          ? 'ready'
          : 'loading'
    return {
      status,
      data,
      reload: () => {
        void catalogQuery.refetch()
        void itemsQuery.refetch()
      },
    }
  }, [misCosasOpen, catalogQuery, itemsQuery])
  // Notifications come from the app-wide provider so live socket pushes show
  // up here without a refetch — it loads on login regardless of the active tab.
  const notifications = useNotifications()
  const news = useAsyncSection(useCallback(() => fetchNews(), []), opened['mis-cosas'])
  const savedCatalogs = useAsyncSection(
    useCallback(() => fetchSavedCatalogs(), []),
    opened.comprar,
  )

  return (
    <div className="flex flex-col gap-6 p-5">
      <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>

      <HomeTabs
        active={tab}
        onSelect={(next) => setSearchParams(next === 'mis-cosas' ? {} : { tab: next })}
      />

      {tab === 'mis-cosas' ? (
        <MisCosasPanel myCatalog={myCatalog} notifications={notifications} news={news} />
      ) : (
        <ComprarPanel savedCatalogs={savedCatalogs} />
      )}
    </div>
  )
}
