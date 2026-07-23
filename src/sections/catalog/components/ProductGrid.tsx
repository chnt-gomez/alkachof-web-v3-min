import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditCatalog } from '../context/EditCatalogContext'
import { ItemFormDialog } from './ItemFormDialog'
import { DeleteItemConfirm } from './DeleteItemConfirm'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export function ProductGrid() {
  const { catalog, items, createItem, updateItem, deleteItem } = useEditCatalog()
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [addingProduct, setAddingProduct] = useState(false)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground">
          {items.length} {items.length === 1 ? 'producto' : 'productos'}
        </p>
        <Button size="sm" onClick={() => setAddingProduct(true)}>
          <Plus size={14} className="mr-1" />
          Agregar producto
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Aún no tienes productos en este catálogo.</p>
          <Button size="sm" onClick={() => setAddingProduct(true)}>
            <Plus size={14} className="mr-1" />
            Agregar primer producto
          </Button>
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
                aria-label={item.name || 'Producto sin nombre'}
              >
                {item.imgPath ? (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    <img
                      src={item.imgPath}
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
                    {item.name || 'Producto sin nombre'}
                  </p>
                  <p className="text-sm font-bold text-primary">{formatPrice(item.price)}</p>
                  {item.stock === 0 && (
                    <p className="self-start rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                      Sin existencias
                    </p>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDeletingItem(item)}
                aria-label={`Eliminar ${item.name || 'producto'}`}
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
          onSubmit={(payload) => updateItem(editingItem._id, payload)}
          onClose={() => setEditingItem(null)}
        />
      )}

      {addingProduct && catalog && (
        <ItemFormDialog
          mode="create"
          onSubmit={(payload) => createItem({ catalogId: catalog._id, ...payload })}
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
