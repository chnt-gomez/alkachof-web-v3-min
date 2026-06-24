import { createContext, useContext, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api'
import { fetchPublicCatalog, type Catalog } from '../actions/fetchPublicCatalog'
import { fetchCatalogItems, type Item } from '../actions/fetchCatalogItems'

type PublicCatalogState = {
  catalog: Catalog | null
  items: Item[]
  isLoading: boolean
  error: string | null
  notFound: boolean
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
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    setNotFound(false)

    Promise.all([fetchPublicCatalog(catalogId), fetchCatalogItems(catalogId)])
      .then(([catalogData, itemsData]) => {
        setCatalog(catalogData)
        setItems(itemsData)
      })
      .catch((err: Error) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
          return
        }
        setError(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [catalogId])

  return (
    <PublicCatalogContext.Provider value={{ catalog, items, isLoading, error, notFound }}>
      {children}
    </PublicCatalogContext.Provider>
  )
}

export function usePublicCatalog() {
  const ctx = useContext(PublicCatalogContext)
  if (!ctx) throw new Error('usePublicCatalog must be used inside PublicCatalogProvider')
  return ctx
}
