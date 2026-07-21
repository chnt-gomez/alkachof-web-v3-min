import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import type { CartLine } from '../types'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

type Props = {
  line: CartLine
  catalogId: string
}

export function CartLineItem({ line, catalogId }: Props) {
  const { setQuantity, isMutating } = useCart()

  const handleQtyChange = (newQty: number) => {
    setQuantity(catalogId, line.itemId, newQty)
  }

  return (
    <div className="flex gap-3 rounded-lg border bg-card p-3">
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {line.imgPath ? (
          <img
            src={line.imgPath}
            alt={line.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-sm font-medium">{line.name}</p>
        <p className="text-sm font-semibold text-primary">{formatPrice(line.price)}</p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg border bg-muted p-0.5">
            <button
              onClick={() => handleQtyChange(line.quantity - 1)}
              disabled={isMutating || line.quantity <= 1}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-background disabled:opacity-50"
              aria-label="Disminuir"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-xs font-medium">{line.quantity}</span>
            <button
              onClick={() => handleQtyChange(line.quantity + 1)}
              disabled={isMutating || line.quantity >= line.stock}
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
