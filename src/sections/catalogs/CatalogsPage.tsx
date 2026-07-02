import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetchMyCatalogs } from './actions/fetchMyCatalogs'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { CatalogCard } from './components/CatalogCard'
import { NewCatalogDialog } from './components/NewCatalogDialog'

type Status = 'loading' | 'ready' | 'error'

export function CatalogsPage() {
  const [status, setStatus] = useState<Status>('loading')
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [showDialog, setShowDialog] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const data = await fetchMyCatalogs()
      setCatalogs(data)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleCreated(catalog: Catalog) {
    setCatalogs((prev) => [...prev, catalog])
    setShowDialog(false)
  }

  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Mis catálogos</h1>
        {status === 'ready' && catalogs.length > 0 && (
          <Button size="sm" onClick={() => setShowDialog(true)}>
            Nuevo catálogo
          </Button>
        )}
      </header>

      {status === 'loading' && <CatalogsSkeleton />}

      {status === 'error' && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">No pudimos cargar tus catálogos.</p>
          <Button size="sm" variant="outline" onClick={load}>
            Reintentar
          </Button>
        </div>
      )}

      {status === 'ready' && catalogs.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center">
          <h2 className="text-base font-semibold">Aún no tienes catálogos</h2>
          <p className="text-sm text-muted-foreground">
            Crea tu primer catálogo para empezar a publicar tus productos.
          </p>
          <Button onClick={() => setShowDialog(true)}>Crear mi primer catálogo</Button>
        </div>
      )}

      {status === 'ready' && catalogs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {catalogs.map((catalog) => (
            <li key={catalog._id}>
              <CatalogCard catalog={catalog} />
            </li>
          ))}
        </ul>
      )}

      {showDialog && <NewCatalogDialog onClose={() => setShowDialog(false)} onCreated={handleCreated} />}
    </section>
  )
}

function CatalogsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando catálogos">
      {[0, 1].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  )
}
