import { createContext, useContext, useEffect, useState } from 'react'
import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'
import { fetchCatalogItems } from '../actions/fetchCatalogItems'
import { updateCatalog as updateCatalogAction } from '../actions/updateCatalog'
import { updateItem as updateItemAction } from '../actions/updateItem'
import { createItem as createItemAction } from '../actions/createItem'
import { deleteItem as deleteItemAction } from '../actions/deleteItem'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import type { NewItemData } from '../actions/createItem'

type EditCatalogState = {
  catalog: Catalog | null
  items: Item[]
  isLoading: boolean
  error: string | null
  updateCatalog: (patch: Partial<Catalog>) => Promise<void>
  updateItem: (itemId: string, patch: Partial<Item>) => Promise<void>
  createItem: (data: NewItemData) => Promise<void>
  deleteItem: (itemId: string) => Promise<void>
}

const EditCatalogContext = createContext<EditCatalogState | null>(null)

export function EditCatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    // The owner's catalog is resolved from the auth token, then its items are
    // loaded with the id the backend returns.
    fetchMyCatalog()
      .then(async (catalogData) => {
        const itemsData = await fetchCatalogItems(catalogData._id)
        setCatalog(catalogData)
        setItems(itemsData)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [])

  async function updateCatalog(patch: Partial<Catalog>) {
    const previous = catalog
    if (!previous) return
    setCatalog({ ...previous, ...patch })
    try {
      const updated = await updateCatalogAction(previous._id, patch)
      setCatalog(updated)
    } catch (err) {
      setCatalog(previous)
      throw err
    }
  }

  async function updateItem(itemId: string, patch: Partial<Item>) {
    const updated = await updateItemAction(itemId, patch)
    setItems((prev) => prev.map((it) => (it._id === itemId ? updated : it)))
  }

  async function createItem(data: NewItemData) {
    const created = await createItemAction(data)
    setItems((prev) => [...prev, created])
  }

  async function deleteItem(itemId: string) {
    await deleteItemAction(itemId)
    setItems((prev) => prev.filter((it) => it._id !== itemId))
  }

  return (
    <EditCatalogContext.Provider
      value={{ catalog, items, isLoading, error, updateCatalog, updateItem, createItem, deleteItem }}
    >
      {children}
    </EditCatalogContext.Provider>
  )
}

export function useEditCatalog() {
  const ctx = useContext(EditCatalogContext)
  if (!ctx) throw new Error('useEditCatalog must be used inside EditCatalogProvider')
  return ctx
}
