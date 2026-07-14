import { useState } from 'react'
import { X, Minus, Plus } from 'lucide-react'
import { useCart } from '@/sections/cart/context/CartContext'
import { useToast } from '@/components/ui/useToast'
import { Button } from '@/components/ui/button'
import type { Item } from '../actions/fetchCatalogItems'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

type Props = {
  item: Item
  onClose: () => void
}

export function ProductDetailDialog({ item, onClose }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const { addItem } = useCart()
  const toast = useToast()

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      await addItem(item, quantity)
      toast.success('Agregado al carrito')
      onClose()
    } catch {
      // Error is already handled in context
    } finally {
      setIsAdding(false)
    }
  }

  const canAdd = item.stock > 0
  const qtyDisabled = quantity >= item.stock

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

          {canAdd && (
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center gap-2 rounded-lg border bg-muted p-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-background"
                  aria-label="Disminuir cantidad"
                >
                  <Minus size={16} />
                </button>
                <span className="flex-1 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(item.stock, q + 1))}
                  disabled={qtyDisabled}
                  className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-background disabled:opacity-50"
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={16} />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={isAdding}
                className="w-full"
              >
                {isAdding ? 'Agregando...' : 'Agregar al carrito'}
              </Button>
            </div>
          )}

          {!canAdd && (
            <Button disabled className="w-full" variant="secondary">
              Sin existencias
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
