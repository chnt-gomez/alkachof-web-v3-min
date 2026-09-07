import { useCallback, useState } from 'react'
import { Instagram, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate, formatItemPrice } from '@/lib/format'
import { isService } from '@/lib/item'
import { ItemTypeChip } from '@/components/ItemTypeChip'
import { useEditCatalog } from '../context/EditCatalogContext'
import { ItemFormDialog } from './ItemFormDialog'
import { DeleteItemConfirm } from './DeleteItemConfirm'
import { InstagramImportDialog } from './InstagramImportDialog'
import { useInstagramAvailability } from '../hooks/useInstagramAvailability'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { resolveMediaUrl } from '@/lib/mediaUrl'

export function ProductGrid() {
  const { catalog, items, createItem, updateItem, deleteItem, reloadItems } = useEditCatalog()
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [addingProduct, setAddingProduct] = useState(false)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)
  const [importing, setImporting] = useState(false)

  /**
   * Reading the Instagram feed is a billed scraper run, and the API allows one
   * per seller per cooldown. Asking the (unmetered) status endpoint here means a
   * seller who has already imported never opens a dialog that could only refuse
   * them. The API enforces the gate regardless — this is what keeps them off it.
   */
  const instagram = useInstagramAvailability()
  const { refresh: refreshInstagram } = instagram

  // Wrapped so the import hook, which holds it in a dependency list, is not
  // rebuilt on every keystroke elsewhere in the provider.
  const handleImported = useCallback(() => {
    void reloadItems()
    // A successful import is what starts the cooldown, so the button this
    // screen offers has to go stale the moment the dialog reports back.
    refreshInstagram()
  }, [reloadItems, refreshInstagram])

  /** Shared by both entry points — the empty state has its own copy of it. */
  const importButton = (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setImporting(true)}
      disabled={!instagram.available}
      title={
        instagram.available
          ? undefined
          : instagram.nextAvailable
            ? `Podrás importar de nuevo el ${formatDate(instagram.nextAvailable)}`
            : 'Podrás importar de nuevo más adelante'
      }
    >
      <Instagram size={14} className="mr-1" />
      Importar de Instagram
    </Button>
  )

  /**
   * A disabled button with no explanation reads as a broken one. The date is the
   * whole message — a seller who knows when they can come back is not blocked,
   * they are scheduled.
   *
   * Takes its alignment from the caller: the header row is right-aligned under
   * the buttons, the empty state is a centred column.
   */
  const cooldownHint = (align: string) =>
    !instagram.available && (
      <p className={`w-full text-xs text-muted-foreground ${align}`}>
        {instagram.nextAvailable
          ? `Podrás importar de Instagram de nuevo el ${formatDate(instagram.nextAvailable)}.`
          : 'Podrás importar de Instagram de nuevo más adelante.'}
      </p>
    )

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted-foreground">
          {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
        </p>
        <div className="flex flex-wrap gap-2">
          {importButton}
          <Button size="sm" onClick={() => setAddingProduct(true)}>
            <Plus size={14} className="mr-1" />
            Agregar artículo
          </Button>
        </div>
        {cooldownHint('text-right')}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Aún no tienes artículos en este catálogo.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => setAddingProduct(true)}>
              <Plus size={14} className="mr-1" />
              Agregar primer artículo
            </Button>
            {importButton}
          </div>
          {cooldownHint('text-center')}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item._id}
              className="flex items-stretch gap-3 overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-primary hover:shadow-md"
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-3 p-2 text-left focus:outline-none"
                onClick={() => setEditingItem(item)}
                aria-label={
                  item.name || (isService(item) ? 'Servicio sin nombre' : 'Producto sin nombre')
                }
              >
                {item.imgPath ? (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    <img
                      src={resolveMediaUrl(item.imgPath)}
                      alt={item.name || 'Producto'}
                      className="max-h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-center text-[10px] leading-tight text-muted-foreground">
                    Sin imagen
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="line-clamp-2 text-sm font-medium leading-tight">
                    {item.name || (isService(item) ? 'Servicio sin nombre' : 'Producto sin nombre')}
                  </p>
                  <p className="text-sm font-bold text-primary">{formatItemPrice(item)}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <ItemTypeChip item={item} />
                    {!isService(item) && item.outOfStock && (
                      <p className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                        Sin existencias
                      </p>
                    )}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDeletingItem(item)}
                aria-label={`Eliminar ${item.name || (isService(item) ? 'servicio' : 'producto')}`}
                className="flex shrink-0 items-center px-3 text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editingItem && (
        <ItemFormDialog
          mode="edit"
          initial={editingItem}
          onSubmit={({ image, ...patch }) => updateItem(editingItem._id, patch, image)}
          onClose={() => setEditingItem(null)}
        />
      )}

      {addingProduct && catalog && (
        <ItemFormDialog
          mode="create"
          onSubmit={({ name, description, price, image, type }) =>
            createItem({ catalogId: catalog._id, name, description, price, image, type })
          }
          onClose={() => setAddingProduct(false)}
        />
      )}

      {importing && (
        <InstagramImportDialog
          onImported={handleImported}
          onClose={() => setImporting(false)}
        />
      )}

      {deletingItem && (
        <DeleteItemConfirm
          itemName={deletingItem.name}
          onConfirm={async () => {
            await deleteItem(deletingItem._id)
            setDeletingItem(null)
          }}
          onClose={() => setDeletingItem(null)}
        />
      )}
    </>
  )
}
