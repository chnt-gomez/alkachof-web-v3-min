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
        <ul className="columns-2 gap-3">
          {items.map((item) => (
            <li key={item._id} className="relative mb-3 break-inside-avoid">
              <button
                className="flex w-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setEditingItem(item)}
                aria-label={item.name || 'Producto sin nombre'}
              >
                {item.imgPath ? (
                  <div className="flex w-full items-center justify-center overflow-hidden bg-muted">
                    <img
                      src={item.imgPath}
                      alt={item.name || 'Producto'}
                      className="w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                    Sin imagen
                  </div>
                )}
                <div className="flex flex-col gap-1 p-2.5">
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
                className="absolute right-1.5 top-1.5 rounded-full bg-background/80 p-1.5 text-destructive shadow-sm transition-colors hover:bg-background"
              >
                <Trash2 size={14} />
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
