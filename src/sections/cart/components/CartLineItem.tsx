import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

type Props = {
  item: Item
  quantity: number
  catalogId: string
}

export function CartLineItem({ item, quantity, catalogId }: Props) {
  const { setQuantity, isMutating } = useCart()

  const handleQtyChange = (newQty: number) => {
    setQuantity(catalogId, item._id, newQty)
  }

  return (
    <div className="flex gap-3 rounded-lg border bg-card p-3">
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {item.imgPath ? (
          <img
            src={item.imgPath}
            alt={item.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
        <p className="text-sm font-semibold text-primary">{formatPrice(item.price)}</p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg border bg-muted p-0.5">
            <button
              onClick={() => handleQtyChange(quantity - 1)}
              disabled={isMutating || quantity <= 1}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-background disabled:opacity-50"
              aria-label="Disminuir"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-xs font-medium">{quantity}</span>
            <button
              onClick={() => handleQtyChange(quantity + 1)}
              disabled={isMutating || quantity >= item.stock}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-background disabled:opacity-50"
              aria-label="Aumentar"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            onClick={() => handleQtyChange(0)}
            disabled={isMutating}
            className="rounded p-1 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            aria-label="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
