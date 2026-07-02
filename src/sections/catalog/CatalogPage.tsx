import { useParams } from 'react-router-dom'
import { EditCatalogProvider } from './context/EditCatalogContext'
import { CatalogHeader } from './components/CatalogHeader'
import { ProductGrid } from './components/ProductGrid'
import { useEditCatalog } from './context/EditCatalogContext'

function CatalogContent() {
  const { isLoading, error } = useEditCatalog()

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Cargando catálogo…</p>
  if (error) return <p className="p-4 text-sm text-destructive">{error}</p>

  return (
    <>
      <CatalogHeader />
      <ProductGrid />
    </>
  )
}

export function CatalogPage() {
  const { catalogId } = useParams<{ catalogId: string }>()

  if (!catalogId) return null

  return (
    <EditCatalogProvider catalogId={catalogId}>
      <main className="flex min-h-screen flex-col gap-4 p-4">
        <CatalogContent />
      </main>
    </EditCatalogProvider>
  )
}
