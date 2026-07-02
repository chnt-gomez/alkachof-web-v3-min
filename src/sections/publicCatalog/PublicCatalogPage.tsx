import { useParams } from 'react-router-dom'
import { LoaderCircle, Sprout } from 'lucide-react'
import { PublicCatalogProvider, usePublicCatalog } from './context/PublicCatalogContext'
import { CatalogJumbotron } from './components/CatalogJumbotron'
import { CatalogItemList } from './components/CatalogItemList'
import { CatalogFaq } from './components/CatalogFaq'
import { CatalogNotFound } from './components/CatalogNotFound'

function PublicCatalogContent() {
  const { isLoading, error, notFound } = usePublicCatalog()

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20" aria-busy="true">
        <LoaderCircle size={28} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
      </div>
    )
  }

  if (notFound) {
    return <CatalogNotFound />
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <>
      <CatalogJumbotron />
      <CatalogItemList />
      <CatalogFaq />
      <footer className="flex items-center justify-center gap-1.5 pb-6 pt-4 text-xs text-muted-foreground">
        <Sprout size={13} />
        Catálogo creado con Alkachof
      </footer>
    </>
  )
}

export function PublicCatalogPage() {
  const { catalogId } = useParams<{ catalogId: string }>()

  if (!catalogId) {
    return <p className="p-4 text-sm text-destructive">ID de catálogo no encontrado.</p>
  }

  return (
    <PublicCatalogProvider catalogId={catalogId}>
      <main className="flex min-h-dvh flex-col gap-5 p-4">
        <PublicCatalogContent />
      </main>
    </PublicCatalogProvider>
  )
}
