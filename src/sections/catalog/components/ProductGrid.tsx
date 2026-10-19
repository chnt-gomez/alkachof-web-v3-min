import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatItemPrice } from '@/lib/format'
import { isService } from '@/lib/item'
import { ItemTypeChip } from '@/components/ItemTypeChip'
import { useEditCatalog } from '../context/EditCatalogContext'
import { ItemFormDialog } from './ItemFormDialog'
import { DeleteItemConfirm } from './DeleteItemConfirm'
import { MAX_CATALOG_ITEMS, remainingCatalogSlots } from '@/lib/catalogLimits'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { resolveMediaUrl } from '@/lib/mediaUrl'

export function ProductGrid() {
  const { catalog, items, createItem, updateItem, deleteItem } = useEditCatalog()
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [addingProduct, setAddingProduct] = useState(false)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)

  /**
   * Whether the catalog has run out of room. The server is what enforces the cap
   * — it refuses the 26th item — so this only buys the seller the explanation,
   * which is why it is a line of copy and not a disabled button.
   */
  const catalogFull = remainingCatalogSlots(items.length) === 0

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted-foreground">
          {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
        </p>
        <Button size="sm" onClick={() => setAddingProduct(true)}>
          <Plus size={14} className="mr-1" />
          Agregar artículo
        </Button>
        {catalogFull && (
          <p className="w-full text-right text-xs text-muted-foreground">
            Tu catálogo llegó al máximo de {MAX_CATALOG_ITEMS} artículos. Elimina alguno para
            agregar más.
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-ink border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Aún no tienes artículos en este catálogo.</p>
          <Button size="sm" onClick={() => setAddingProduct(true)}>
            <Plus size={14} className="mr-1" />
            Agregar primer artículo
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={item._id}
              className="flex items-stretch gap-3 overflow-hidden rounded-2xl border-2 border-ink bg-card focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring"
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-3 p-2 text-left focus:outline-none"
                onClick={() => setEditingItem(item)}
                aria-label={
                  item.name || (isService(item) ? 'Servicio sin nombre' : 'Producto sin nombre')
                }
              >
                <span className="folio shrink-0 self-start pt-1">
                  {String(index + 1).padStart(2, '0')}
                </span>
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
                      <p className="folio rounded-sm border border-destructive bg-destructive-soft px-1.5 py-0.5 uppercase text-destructive">
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
                className="flex shrink-0 items-center px-3 text-destructive transition-colors hover:bg-destructive-soft focus-visible:outline-none"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && remainingCatalogSlots(items.length) > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-2">
            {Array.from(
              { length: Math.min(remainingCatalogSlots(items.length), 4) },
              (_, i) => (
                <li key={`casilla-${i}`}>
                  <button
                    type="button"
                    onClick={() => setAddingProduct(true)}
                    className="box-empty flex w-full items-center gap-3 p-3 text-left transition-[background-color] press-ink"
                  >
                    <span className="folio">
                      {String(items.length + i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-muted-foreground">Casilla libre</span>
                    <Plus size={14} className="ml-auto text-muted-foreground" />
                  </button>
                </li>
              ),
            )}
          </ul>
          <p className="folio uppercase">
            Quedan {remainingCatalogSlots(items.length)} de {MAX_CATALOG_ITEMS} casillas
          </p>
        </div>
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
