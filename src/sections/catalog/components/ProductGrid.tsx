import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditCatalog } from '../context/EditCatalogContext'
import { EditProductModal } from './EditProductModal'
import { AddProductModal } from './AddProductModal'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export function ProductGrid() {
  const { catalog, items } = useEditCatalog()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [addingProduct, setAddingProduct] = useState(false)

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
            <li key={item._id} className="mb-3 break-inside-avoid">
              <button
                className="flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setSelectedItem(item)}
                aria-label={item.name}
              >
                {item.imgPath ? (
                  <div className="flex w-full items-center justify-center overflow-hidden bg-muted">
                    <img
                      src={item.imgPath}
                      alt={item.name}
                      className="w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                    Sin imagen
                  </div>
                )}
                <div className="flex flex-col gap-0.5 p-2">
                  <p className="line-clamp-2 text-xs font-medium leading-tight">{item.name}</p>
                  <p className="text-xs font-semibold text-primary">{formatPrice(item.price)}</p>
                  {item.stock === 0 && (
                    <p className="text-xs text-destructive">Sin existencias</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedItem && (
        <EditProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {addingProduct && catalog && (
        <AddProductModal catalogId={catalog._id} onClose={() => setAddingProduct(false)} />
      )}
    </>
  )
}
