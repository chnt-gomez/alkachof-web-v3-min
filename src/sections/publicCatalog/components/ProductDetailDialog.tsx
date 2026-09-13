import { useState } from 'react'
import { X, Minus, Plus, Share2 } from 'lucide-react'
import { useCart } from '@/sections/cart/context/CartContext'
import { GuestCheckoutPrompt } from '@/sections/cart/components/GuestCheckoutPrompt'
import { useAuth } from '@/sections/auth/useAuth'
import { useToast } from '@/components/ui/useToast'
import { Button } from '@/components/ui/button'
import { productShareUrl } from '@/lib/shareUrl'
import { formatItemPrice } from '@/lib/format'
import { isService } from '@/lib/item'
import { ItemTypeChip } from '@/components/ItemTypeChip'
import { cn } from '@/lib/utils'
import { useServiceRequest } from '../hooks/useServiceRequest'
import { useOwnerGuard } from '../hooks/useOwnerGuard'
import { ServiceRequestDialog } from './ServiceRequestDialog'
import type { Item } from '../actions/fetchCatalogItems'
import { resolveMediaUrl } from '@/lib/mediaUrl'

type Props = {
  item: Item
  onClose: () => void
}

export function ProductDetailDialog({ item, onClose }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [showGuestPrompt, setShowGuestPrompt] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { request } = useServiceRequest()
  const { guard, ariaDisabled, blockedClass } = useOwnerGuard()
  const toast = useToast()

  const service = isService(item)

  // Services are booked, not bought: no quantity, and no cart. The request
  // collects a note first — the seller needs to know what the job is before
  // they can price it — so auth is checked up front, not after the buyer has
  // written one.
  const handleRequest = guard(
    'Este es tu catálogo: no puedes solicitar tus propios servicios.',
    () => {
      if (!isAuthenticated) {
        setShowGuestPrompt(true)
        return
      }
      setShowRequestForm(true)
    },
  )

  const submitRequest = async (note: string) => {
    const outcome = await request(item, note)
    if (outcome.kind === 'needs-auth') {
      setShowRequestForm(false)
      setShowGuestPrompt(true)
      return
    }
    if (outcome.kind === 'error') {
      toast.error(outcome.message)
      setShowRequestForm(false)
      return
    }
    toast.success('Solicitud enviada. El vendedor te enviará un precio.')
    onClose()
  }

  const handleAddToCart = guard(
    'Este es tu catálogo: no puedes comprar tus propios productos.',
    () => {
      void addToCart()
    },
  )

  const addToCart = async () => {
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

  const handleShare = () => {
    const url = productShareUrl(item.catalogId, item._id)

    // Copy in the background so the link lands on the clipboard either way.
    // Don't await it — that would spend the gesture navigator.share() needs.
    void navigator.clipboard?.writeText(url).catch(() => {})

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator
        .share({ title: item.name, text: `Mira este producto: ${item.name}`, url })
        .catch(() => {
          // Share sheet dismissed — the link is already copied, so stay quiet.
        })
    } else {
      toast.success('Link copiado al portapapeles')
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-md flex-col overflow-y-auto rounded-t-2xl bg-background max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleShare}
          className="absolute left-3 top-3 z-10 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur-sm"
          aria-label="Compartir producto"
        >
          <Share2 size={18} />
        </button>

        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur-sm"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {item.imgPath && (
          <img
            src={resolveMediaUrl(item.imgPath)}
            alt={item.name}
            className="w-full object-contain"
          />
        )}

        <div className="flex flex-col gap-3 p-5">
          <h2 className="text-xl font-bold leading-tight">{item.name}</h2>

          <p className="text-2xl font-semibold text-primary">{formatItemPrice(item)}</p>

          <div className="flex flex-wrap items-center gap-2">
            <ItemTypeChip item={item} className="px-2.5 py-1 text-xs" />
            {!service && item.outOfStock && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                Sin existencias
              </span>
            )}
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          {service ? (
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleRequest}
                aria-disabled={ariaDisabled}
                className={cn('w-full', blockedClass)}
              >
                Solicitar
              </Button>
              {item.price === 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  El precio se acuerda directamente con el vendedor.
                </p>
              )}
            </div>
          ) : item.outOfStock ? (
            <Button disabled className="w-full" variant="secondary">
              Sin existencias
            </Button>
          ) : (
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
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-background disabled:opacity-50"
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={16} />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={isAdding}
                aria-disabled={ariaDisabled}
                className={cn('w-full', blockedClass)}
              >
                {isAdding ? 'Agregando...' : 'Agregar al carrito'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Siblings of the overlay, not children: nested, a click inside either
        would bubble up and close the product dialog underneath it. */}
    {showRequestForm && (
      <ServiceRequestDialog
        item={item}
        onSubmit={submitRequest}
        onClose={() => setShowRequestForm(false)}
      />
    )}

    {showGuestPrompt && (
      <GuestCheckoutPrompt
        onClose={() => setShowGuestPrompt(false)}
        title="Crea una cuenta para solicitar"
        body="Necesitas una cuenta para solicitar un servicio y acordar el precio con el vendedor. Regístrate para continuar."
      />
    )}
    </>
  )
}
