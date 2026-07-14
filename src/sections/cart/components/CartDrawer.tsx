import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '@/sections/auth/useAuth'
import { useCart } from '../context/CartContext'
import { fetchCatalogItems, type Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { Button } from '@/components/ui/button'
import { CartLineItem } from './CartLineItem'
import { CheckoutConfirmation } from './CheckoutConfirmation'
import type { CheckoutResult } from '../types'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

type Props = {
  catalogId: string
  isOpen: boolean
  onClose: () => void
}

export function CartDrawer({ catalogId, isOpen, onClose }: Props) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { linesFor, checkout, isMutating } = useCart()
  const [items, setItems] = useState<Item[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null)

  const lines = linesFor(catalogId)
  const isEmpty = lines.length === 0

  if (!isOpen) return null

  const loadItems = async () => {
    if (items.length > 0 || isLoadingItems) return
    setIsLoadingItems(true)
    try {
      const loaded = await fetchCatalogItems(catalogId)
      setItems(loaded)
    } catch {
      // error handled upstream
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    try {
      const result = await checkout(catalogId)
      setCheckoutResult(result)
    } catch {
      // error handled in context
    }
  }

  const subtotal = lines.reduce((sum, line) => {
    const item = items.find((i) => i._id === line.itemId)
    return sum + (item?.price ?? 0) * line.quantity
  }, 0)

  if (!isOpen) return null

  if (checkoutResult) {
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

          <CheckoutConfirmation
            catalogId={catalogId}
            checkoutResult={checkoutResult}
            onClose={onClose}
          />
        </div>
      </div>
    )
  }

  loadItems()

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

        <div className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-bold">Tu carrito</h2>

          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">Tu carrito está vacío</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {lines.map((line) => {
                  const item = items.find((i) => i._id === line.itemId)
                  if (!item) return null
                  return (
                    <CartLineItem
                      key={line.itemId}
                      item={item}
                      quantity={line.quantity}
                      catalogId={catalogId}
                    />
                  )
                })}
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Subtotal</p>
                  <p className="text-lg font-bold">{formatPrice(subtotal)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleCheckout}
                  disabled={isMutating}
                  className="w-full"
                >
                  {isAuthenticated ? 'Finalizar pedido' : 'Inicia sesión para completar'}
                </Button>
                <Button onClick={onClose} variant="outline" className="w-full">
                  Seguir comprando
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
