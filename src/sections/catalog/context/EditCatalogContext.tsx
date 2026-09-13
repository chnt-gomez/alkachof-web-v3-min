import { createContext, useContext } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { useCatalogItems, useMyCatalog } from '@/sections/catalogs/hooks/useOwnerCatalog'
import { updateCatalog as updateCatalogAction } from '../actions/updateCatalog'
import { updateItem as updateItemAction } from '../actions/updateItem'
import { createItem as createItemAction } from '../actions/createItem'
import { deleteItem as deleteItemAction } from '../actions/deleteItem'
import { uploadCatalogImage as uploadCatalogImageAction } from '../actions/uploadCatalogImage'
import { deleteCatalogImage as deleteCatalogImageAction } from '../actions/deleteCatalogImage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import type { NewItemData } from '../actions/createItem'

type EditCatalogState = {
  catalog: Catalog | null
  items: Item[]
  isLoading: boolean
  error: string | null
  updateCatalog: (patch: Partial<Catalog>) => Promise<void>
  /** Persists immediately and resolves to the new image url. */
  uploadCatalogImage: (file: File) => Promise<string>
  deleteCatalogImage: () => Promise<void>
  updateItem: (itemId: string, patch: Partial<Item>, image?: File | null) => Promise<void>
  createItem: (data: NewItemData) => Promise<void>
  deleteItem: (itemId: string) => Promise<void>
  /**
   * Re-reads the item list. For creations this screen did not perform itself —
   * an Instagram import returns only a summary of each new item, not the full
   * `Item` rows the grid renders.
   */
  reloadItems: () => Promise<void>
}

const EditCatalogContext = createContext<EditCatalogState | null>(null)

/**
 * The catalog editor's state.
 *
 * It is an **adapter over the shared cache**, not a store: the catalog and its
 * items live under the keys in `queryKeys`, which Home reads too, so leaving this
 * screen and coming back costs nothing. What this provider owns is the *write*
 * side — every mutation here puts the row the API returned straight into the
 * cache rather than re-reading it.
 *
 * The one exception is `reloadItems`, and it is the only invalidation in the app.
 * See `CLAUDE.md` → Caching.
 */
export function EditCatalogProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  const catalogQuery = useMyCatalog()
  const itemsQuery = useCatalogItems(catalogQuery.data?._id)

  const catalog = catalogQuery.data ?? null
  const items = itemsQuery.data ?? []
  // The items query is disabled — and so reports `isLoading: false` — until the
  // catalog resolves, so this is true for exactly one continuous stretch rather
  // than flickering between the two reads. On a second visit both answer from
  // cache and it is never true at all, which is the whole point.
  const isLoading = catalogQuery.isLoading || itemsQuery.isLoading
  const error = (catalogQuery.error ?? itemsQuery.error)?.message ?? null

  const itemsKey = (catalogId: string) => queryKeys.catalogItems(catalogId)

  async function updateCatalog(patch: Partial<Catalog>) {
    // Read the cache rather than the render, so a save that races a refetch
    // still restores the row that was actually current when it started.
    const previous = queryClient.getQueryData<Catalog>(queryKeys.myCatalog())
    if (!previous) return
    queryClient.setQueryData<Catalog>(queryKeys.myCatalog(), { ...previous, ...patch })
    try {
      const updated = await updateCatalogAction(previous._id, patch)
      queryClient.setQueryData<Catalog>(queryKeys.myCatalog(), updated)
    } catch (err) {
      queryClient.setQueryData<Catalog>(queryKeys.myCatalog(), previous)
      throw err
    }
  }

  // The image endpoints persist immediately, unlike the deferred field form, so
  // the response's full catalog is written straight back — otherwise a later
  // "save" of the other fields would re-render from a stale, image-less copy.
  async function uploadCatalogImage(file: File): Promise<string> {
    if (!catalog) return ''
    const updated = await uploadCatalogImageAction(catalog._id, file)
    queryClient.setQueryData<Catalog>(queryKeys.myCatalog(), updated)
    return updated.image ?? ''
  }

  async function deleteCatalogImage(): Promise<void> {
    if (!catalog) return
    const updated = await deleteCatalogImageAction(catalog._id)
    queryClient.setQueryData<Catalog>(queryKeys.myCatalog(), updated)
  }

  async function updateItem(itemId: string, patch: Partial<Item>, image?: File | null) {
    const updated = await updateItemAction(itemId, patch, image)
    if (!catalog) return
    queryClient.setQueryData<Item[]>(itemsKey(catalog._id), (prev) =>
      (prev ?? []).map((it) => (it._id === itemId ? updated : it)),
    )
  }

  async function createItem(data: NewItemData) {
    const created = await createItemAction(data)
    // `data.catalogId` rather than the loaded catalog: it is what the row was
    // actually created under, so the write cannot land on the wrong key.
    queryClient.setQueryData<Item[]>(itemsKey(data.catalogId), (prev) => [...(prev ?? []), created])
  }

  async function deleteItem(itemId: string) {
    await deleteItemAction(itemId)
    if (!catalog) return
    queryClient.setQueryData<Item[]>(itemsKey(catalog._id), (prev) =>
      (prev ?? []).filter((it) => it._id !== itemId),
    )
  }

  /**
   * The app's only invalidation, and it earns it: an Instagram import creates
   * items server-side that the 201 describes only in summary, so there is no row
   * to write. Everything else here holds the API's own response already.
   */
  async function reloadItems() {
    if (!catalog) return
    await queryClient.invalidateQueries({ queryKey: itemsKey(catalog._id) })
  }

  return (
    <EditCatalogContext.Provider
      value={{
        catalog,
        items,
        isLoading,
        error,
        updateCatalog,
        uploadCatalogImage,
        deleteCatalogImage,
        updateItem,
        createItem,
        deleteItem,
        reloadItems,
      }}
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
