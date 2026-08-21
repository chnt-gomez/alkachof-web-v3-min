import { useState } from 'react'
import { X } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { withMinDuration } from '@/lib/pendingAction'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/useToast'
import { useAuth } from '@/sections/auth/useAuth'
import { useCart } from '../context/CartContext'
import { Button } from '@/components/ui/button'
import { ProgressButton } from '@/components/ui/progressButton'
import { ServiceInCartError } from '../actions/checkoutCart'
import { CartLineItem } from './CartLineItem'
import { CheckoutConfirmation } from './CheckoutConfirmation'
import { GuestCheckoutPrompt } from './GuestCheckoutPrompt'
import type { CartLine, CheckoutResult } from '../types'

type Props = {
  catalogId: string
  isOpen: boolean
  onClose: () => void
  /**
   * The viewer owns this catalog. Passed in rather than read from the catalog
   * context so the cart section stays independent of the public-catalog one.
   */
  isOwner?: boolean
}

export function CartDrawer({ catalogId, isOpen, onClose, isOwner = false }: Props) {
  const { isAuthenticated } = useAuth()
  const { linesFor, checkout } = useCart()
  const toast = useToast()
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null)
  const [purchasedLines, setPurchasedLines] = useState<CartLine[]>([])
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [showGuestPrompt, setShowGuestPrompt] = useState(false)
  /** Name of a service the server refused, once it has been dropped from the cart. */
  const [rejectedService, setRejectedService] = useState<string | null>(null)

  const cartLines = linesFor(catalogId)

  // While checking out, the cart is already emptied (checkout resolves instantly
  // under mocks), so freeze the view on the captured snapshot — otherwise the
  // button and its progress bar would vanish before the fill is ever seen.
  const displayLines = isCheckingOut ? purchasedLines : cartLines
  const isEmpty = displayLines.length === 0

  if (!isOpen) return null

  const handleCheckout = async () => {
    // An owner browsing their own shop can't buy from themselves — the backend
    // would reject it, so say why rather than letting the request go out.
    if (isOwner) {
      toast.error('Este es tu catálogo: no puedes comprar tus propios productos.')
      return
    }

    // Guests can build a cart, but completing the purchase requires an account.
    // Encourage them to sign up instead of hitting the checkout endpoint.
    if (!isAuthenticated) {
      setShowGuestPrompt(true)
      return
    }

    // Snapshot the lines before checkout empties the cart, so both the frozen
    // view and the confirmation can show the real order summary and total.
    setPurchasedLines(cartLines)
    setIsCheckingOut(true)
    setRejectedService(null)
    try {
      const result = await withMinDuration(checkout(catalogId))
      setCheckoutResult(result)
    } catch (err) {
      // A service slipped into the cart (added before the client tracked item
      // types). The context has already removed it and nothing was charged, so
      // name it and invite a retry rather than showing a bare error.
      if (err instanceof ServiceInCartError) {
        const line = cartLines.find((l) => l.itemId === err.itemId)
        setRejectedService(line?.name ?? 'Un servicio')
      }
      // other errors are surfaced by the context's toast
    } finally {
      setIsCheckingOut(false)
    }
  }

  // Subtotal is derived from the cart lines themselves — each line snapshots
  // its price at add time, so no catalog re-fetch is needed.
  const subtotal = displayLines.reduce((sum, line) => sum + line.price * line.quantity, 0)

  if (showGuestPrompt) {
    return <GuestCheckoutPrompt onClose={() => setShowGuestPrompt(false)} />
  }

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

          {rejectedService && (
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-xl border border-amber-300 bg-amber-50 p-3"
            >
              <p className="text-sm font-semibold text-amber-900">
                Quitamos «{rejectedService}» de tu carrito
              </p>
              <p className="text-xs text-amber-800">
                Es un servicio, y los servicios se solicitan al vendedor en lugar de comprarse.
                No se hizo ningún cargo: puedes finalizar tu pedido con el resto.
              </p>
            </div>
          )}

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
                <ProgressButton
                  onClick={handleCheckout}
                  aria-disabled={isOwner || undefined}
                  className={cn('w-full', isOwner && 'opacity-50')}
                  pending={isCheckingOut}
                  progressLabel="Procesando pedido"
                >
                  Finalizar pedido
                </ProgressButton>
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
