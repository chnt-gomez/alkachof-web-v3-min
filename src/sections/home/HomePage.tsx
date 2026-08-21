import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'
import { fetchCatalogItems } from '@/sections/catalog/actions/fetchCatalogItems'
import { useNotifications } from '@/sections/notifications/useNotifications'
import { fetchSavedCatalogs } from './actions/fetchSavedCatalogs'
import { fetchNews } from './actions/fetchNews'
import { useAsyncSection } from './hooks/useAsyncSection'
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

  const loadMyCatalog = useCallback(async () => {
    const catalog = await fetchMyCatalog()
    const items = await fetchCatalogItems(catalog._id)
    return { catalog, itemCount: items.length }
  }, [])

  const myCatalog = useAsyncSection(loadMyCatalog, opened['mis-cosas'])
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
