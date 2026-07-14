import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { fetchPublicCatalog, type Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { fetchCatalogItems, type Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { useCart } from '../context/CartContext'
import { Button } from '@/components/ui/button'
import type { CheckoutResult } from '../types'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

type Props = {
  catalogId: string
  checkoutResult: CheckoutResult
  onClose: () => void
}

export function CheckoutConfirmation({ catalogId, checkoutResult, onClose }: Props) {
  const { linesFor } = useCart()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [items, setItems] = useState<Item[]>([])

  const lines = linesFor(catalogId)

  useEffect(() => {
    Promise.all([
      fetchPublicCatalog(catalogId),
      fetchCatalogItems(catalogId),
    ])
      .then(([c, i]) => {
        setCatalog(c)
        setItems(i)
      })
      .catch(() => {
        // errors handled upstream
      })
  }, [catalogId])

  const total = lines.reduce((sum, line) => {
    const item = items.find((i) => i._id === line.itemId)
    return sum + (item?.price ?? 0) * line.quantity
  }, 0)

  const payOptionsLabels: Record<string, string> = {
    cash: 'Efectivo',
    credit: 'Tarjeta de crédito',
    transfer: 'Transferencia',
    other: 'Otro método',
  }

  const deliveryLabels: Record<string, string> = {
    'location-pickup': 'Recolección en tienda',
    delivery: 'Entrega',
    shipping: 'Envío',
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="rounded-full bg-green-100 p-3">
          <Check size={24} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold">¡Pedido enviado!</h2>
        <p className="text-sm text-muted-foreground">
          El vendedor confirmará tu pedido
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-muted p-4">
        <h3 className="text-sm font-semibold">Resumen del pedido</h3>
        {lines.map((line) => {
          const item = items.find((i) => i._id === line.itemId)
          if (!item) return null
          return (
            <div key={line.itemId} className="flex items-start justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  Cantidad: {line.quantity}
                </p>
              </div>
              <p className="font-semibold">{formatPrice(item.price * line.quantity)}</p>
            </div>
          )
        })}

        <div className="border-t pt-2">
          <div className="flex items-center justify-between font-bold">
            <p>Total</p>
            <p>{formatPrice(total)}</p>
          </div>
        </div>
      </div>

      {catalog && (
        <div className="flex flex-col gap-3 rounded-lg bg-muted p-4 text-sm">
          <h3 className="font-semibold">Detalles de entrega</h3>

          {catalog.payOptions && catalog.payOptions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Métodos de pago</p>
              <p className="text-sm">
                {catalog.payOptions
                  .map((opt) => payOptionsLabels[opt] || opt)
                  .join(', ')}
              </p>
            </div>
          )}

          {catalog.deliveryType && catalog.deliveryType.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Entrega</p>
              <p className="text-sm">
                {catalog.deliveryType
                  .map((opt) => deliveryLabels[opt] || opt)
                  .join(', ')}
              </p>
            </div>
          )}

          {catalog.location && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ubicación</p>
              <p className="text-sm">{catalog.location}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs text-center text-muted-foreground">
          ID de transacción: <span className="font-mono text-xs">{checkoutResult.transaction.id}</span>
        </p>
        <Button onClick={onClose} className="w-full">
          Cerrar
        </Button>
      </div>
    </div>
  )
}
