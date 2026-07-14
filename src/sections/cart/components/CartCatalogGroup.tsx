import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useToast } from '@/components/ui/useToast'
import { Button } from '@/components/ui/button'
import { CartLineItem } from './CartLineItem'
import { CheckoutConfirmation } from './CheckoutConfirmation'
import type { Cart, CheckoutResult } from '../types'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

type Props = {
  cart: Cart
  catalog: Catalog
  items: Item[]
}

export function CartCatalogGroup({ cart, catalog, items }: Props) {
  const { clearCart, checkout, isMutating } = useCart()
  const toast = useToast()
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null)
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)

  if (checkoutResult) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <CheckoutConfirmation
          catalogId={cart.catalogId}
          checkoutResult={checkoutResult}
          onClose={() => {
            // keep the confirmation visible
          }}
        />
      </div>
    )
  }

  const subtotal = cart.items.reduce((sum, line) => {
    const item = items.find((i) => i._id === line.itemId)
    return sum + (item?.price ?? 0) * line.quantity
  }, 0)

  const handleCheckout = async () => {
    try {
      const result = await checkout(cart.catalogId)
      setCheckoutResult(result)
    } catch {
      // error handled in context
    }
  }

  const handleClearCart = async () => {
    try {
      await clearCart(cart.catalogId)
      setIsConfirmingClear(false)
      toast.success('Carrito vaciado')
    } catch {
      // error handled in context
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-4 text-lg font-bold">{catalog.alias || 'Catálogo'}</h2>

      <div className="flex flex-col gap-3 mb-4">
        {cart.items.map((line) => {
          const item = items.find((i) => i._id === line.itemId)
          if (!item) return null
          return (
            <CartLineItem
              key={line.itemId}
              item={item}
              quantity={line.quantity}
              catalogId={cart.catalogId}
            />
          )
        })}
      </div>

      <div className="border-t pt-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold">Subtotal</p>
          <p className="text-xl font-bold">{formatPrice(subtotal)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleCheckout}
          disabled={isMutating}
          className="w-full"
        >
          {isMutating ? 'Procesando...' : 'Finalizar pedido'}
        </Button>

        {isConfirmingClear ? (
          <>
            <p className="text-xs text-center text-muted-foreground py-2">
              ¿Estás seguro de que deseas vaciar este carrito?
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleClearCart}
                disabled={isMutating}
                variant="destructive"
                className="flex-1"
              >
                Confirmar
              </Button>
              <Button
                onClick={() => setIsConfirmingClear(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <Button
            onClick={() => setIsConfirmingClear(true)}
            variant="outline"
            className="w-full"
          >
            Vaciar carrito
          </Button>
        )}
      </div>
    </div>
  )
}
