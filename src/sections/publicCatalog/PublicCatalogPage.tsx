import { useParams } from 'react-router-dom'
import { PublicCatalogProvider, usePublicCatalog } from './context/PublicCatalogContext'
import { CatalogJumbotron } from './components/CatalogJumbotron'
import { CatalogItemList } from './components/CatalogItemList'
import { CatalogNotFound } from './components/CatalogNotFound'

function PublicCatalogContent() {
  const { isLoading, error, notFound } = usePublicCatalog()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
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
      <main className="flex min-h-screen flex-col gap-4 p-4">
        <PublicCatalogContent />
      </main>
    </PublicCatalogProvider>
  )
}
