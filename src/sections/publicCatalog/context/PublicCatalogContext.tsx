import { createContext, useContext, useEffect, useState } from 'react'
import { fetchPublicCatalog, type Catalog } from '../actions/fetchPublicCatalog'
import { fetchCatalogItems, type Item } from '../actions/fetchCatalogItems'

type PublicCatalogState = {
  catalog: Catalog | null
  items: Item[]
  isLoading: boolean
  error: string | null
}

const PublicCatalogContext = createContext<PublicCatalogState | null>(null)

export function PublicCatalogProvider({
  catalogId,
  children,
}: {
  catalogId: string
  children: React.ReactNode
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    Promise.all([fetchPublicCatalog(catalogId), fetchCatalogItems(catalogId)])
      .then(([catalogData, itemsData]) => {
        setCatalog(catalogData)
        setItems(itemsData)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [catalogId])

  return (
    <PublicCatalogContext.Provider value={{ catalog, items, isLoading, error }}>
      {children}
    </PublicCatalogContext.Provider>
  )
}

export function usePublicCatalog() {
  const ctx = useContext(PublicCatalogContext)
  if (!ctx) throw new Error('usePublicCatalog must be used inside PublicCatalogProvider')
  return ctx
}
