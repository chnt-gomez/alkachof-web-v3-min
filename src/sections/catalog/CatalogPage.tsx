import { useParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { EditCatalogProvider } from './context/EditCatalogContext'
import { CatalogHeader } from './components/CatalogHeader'
import { ProductGrid } from './components/ProductGrid'
import { useEditCatalog } from './context/EditCatalogContext'

function CatalogContent() {
  const { isLoading, error } = useEditCatalog()

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20" aria-busy="true">
        <LoaderCircle size={28} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
      </div>
    )
  }
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
      <main className="flex flex-col gap-4 p-4">
        <CatalogContent />
      </main>
    </EditCatalogProvider>
  )
}
