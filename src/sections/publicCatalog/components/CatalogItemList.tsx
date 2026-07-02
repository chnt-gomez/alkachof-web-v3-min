import { useState } from 'react'
import { usePublicCatalog } from '../context/PublicCatalogContext'
import { ProductDetailDialog } from './ProductDetailDialog'
import type { Item } from '../actions/fetchCatalogItems'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export function CatalogItemList() {
  const { items } = usePublicCatalog()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">Sin productos aún.</p>
      </div>
    )
  }

  return (
    <>
      <ul className="columns-2 gap-3">
        {items.map((item) => (
          <li key={item._id} className="mb-3 break-inside-avoid">
            <button
              className="flex w-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setSelectedItem(item)}
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
                <div className="flex h-24 w-full items-center justify-center bg-muted text-muted-foreground text-xs">
                  Sin imagen
                </div>
              )}
              <div className="flex flex-col gap-1 p-2.5">
                <p className="line-clamp-2 text-sm font-medium leading-tight">{item.name}</p>
                <p className="text-sm font-bold text-primary">{formatPrice(item.price)}</p>
                {item.stock === 0 && (
                  <p className="self-start rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    Sin existencias
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selectedItem && (
        <ProductDetailDialog
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  )
}
