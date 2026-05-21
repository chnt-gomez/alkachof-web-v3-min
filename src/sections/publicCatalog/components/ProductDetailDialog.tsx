import { X } from 'lucide-react'
import type { Item } from '../actions/fetchCatalogItems'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

type Props = {
  item: Item
  onClose: () => void
}

export function ProductDetailDialog({ item, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-md flex-col overflow-y-auto rounded-t-2xl bg-background max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur-sm"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {item.imgPath && (
          <img
            src={item.imgPath}
            alt={item.name}
            className="w-full object-contain"
          />
        )}

        <div className="flex flex-col gap-3 p-5">
          <h2 className="text-xl font-bold leading-tight">{item.name}</h2>

          <p className="text-2xl font-semibold text-primary">{formatPrice(item.price)}</p>

          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          <div className="flex flex-col gap-1">
            {item.stock > 0 ? (
              <p className="text-sm text-muted-foreground">{item.stock} disponibles</p>
            ) : (
              <p className="text-sm font-medium text-destructive">Sin existencias</p>
            )}
          </div>

          {item.sizes.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tallas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.sizes.map((s) => (
                  <span key={s} className="rounded border px-2 py-1 text-sm">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
