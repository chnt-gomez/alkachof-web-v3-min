import { createContext, useContext, useEffect, useState } from 'react'
import { fetchCatalog } from '@/sections/catalogs/actions/fetchCatalog'
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

export function EditCatalogProvider({
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
    Promise.all([fetchCatalog(catalogId), fetchCatalogItems(catalogId)])
      .then(([catalogData, itemsData]) => {
        setCatalog(catalogData)
        setItems(itemsData)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [catalogId])

  async function updateCatalog(patch: Partial<Catalog>) {
    const previous = catalog
    if (previous) setCatalog({ ...previous, ...patch })
    try {
      const updated = await updateCatalogAction(catalogId, patch)
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
