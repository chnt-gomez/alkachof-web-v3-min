import { createContext, useContext, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/sections/auth/useAuth'
import { fetchPublicCatalog, type Catalog } from '../actions/fetchPublicCatalog'
import { fetchCatalogItems, type Item } from '../actions/fetchCatalogItems'

type PublicCatalogState = {
  catalog: Catalog | null
  items: Item[]
  isLoading: boolean
  error: string | null
  notFound: boolean
  /**
   * The visitor is the catalog's owner, looking at their own shop. They may
   * browse it, but every buyer-side action (buying, asking, requesting) is
   * meaningless against themselves and rejected by the backend, so the UI
   * blocks it up front. Computed once here so every consumer agrees.
   */
  isOwner: boolean
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
  const { profile } = useAuth()

  const isOwner = Boolean(catalog && profile && catalog.userId === profile.userId)

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
    <PublicCatalogContext.Provider
      value={{ catalog, items, isLoading, error, notFound, isOwner }}
    >
      {children}
    </PublicCatalogContext.Provider>
  )
}

export function usePublicCatalog() {
  const ctx = useContext(PublicCatalogContext)
  if (!ctx) throw new Error('usePublicCatalog must be used inside PublicCatalogProvider')
  return ctx
}
