import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '@/sections/auth/useAuth'
import { useCart } from '../context/CartContext'
import { Button } from '@/components/ui/button'
import { CartLineItem } from './CartLineItem'
import { CheckoutConfirmation } from './CheckoutConfirmation'
import type { CartLine, CheckoutResult } from '../types'

// The checkout button fills left-to-right as a progress bar over this window
// before the confirmation appears, so checkout always registers as work.
const MIN_CHECKOUT_MS = 1000

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
  const { linesFor, checkout } = useCart()
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null)
  const [purchasedLines, setPurchasedLines] = useState<CartLine[]>([])
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const cartLines = linesFor(catalogId)

  // While checking out, the cart is already emptied (checkout resolves instantly
  // under mocks), so freeze the view on the captured snapshot — otherwise the
  // button and its progress bar would vanish before the fill is ever seen.
  const displayLines = isCheckingOut ? purchasedLines : cartLines
  const isEmpty = displayLines.length === 0

  if (!isOpen) return null

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    // Snapshot the lines before checkout empties the cart, so both the frozen
    // view and the confirmation can show the real order summary and total.
    setPurchasedLines(cartLines)
    setIsCheckingOut(true)
    try {
      const [result] = await Promise.all([
        checkout(catalogId),
        new Promise((resolve) => setTimeout(resolve, MIN_CHECKOUT_MS)),
      ])
      setCheckoutResult(result)
    } catch {
      // error handled in context
    } finally {
      setIsCheckingOut(false)
    }
  }

  // Subtotal is derived from the cart lines themselves — each line snapshots
  // its price at add time, so no catalog re-fetch is needed.
  const subtotal = displayLines.reduce((sum, line) => sum + line.price * line.quantity, 0)

  if (checkoutResult) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-overlay-fade sm:items-center sm:p-4"
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
            lines={purchasedLines}
            checkoutResult={checkoutResult}
            onClose={onClose}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-overlay-fade sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-md flex-col overflow-y-auto rounded-t-2xl bg-background max-h-[90vh] animate-sheet-pop sm:rounded-2xl"
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
                {displayLines.map((line) => (
                  <CartLineItem
                    key={line.itemId}
                    line={line}
                    catalogId={catalogId}
                  />
                ))}
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
                  disabled={isCheckingOut}
                  className="relative w-full overflow-hidden"
                >
                  {isCheckingOut && (
                    <span
                      role="progressbar"
                      aria-label="Procesando pedido"
                      className="absolute inset-y-0 left-0 z-0 bg-primary-foreground/25 animate-progress-fill"
                    />
                  )}
                  <span className="relative z-10">
                    {isCheckingOut
                      ? 'Procesando…'
                      : isAuthenticated
                        ? 'Finalizar pedido'
                        : 'Inicia sesión para completar'}
                  </span>
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                  disabled={isCheckingOut}
                >
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
