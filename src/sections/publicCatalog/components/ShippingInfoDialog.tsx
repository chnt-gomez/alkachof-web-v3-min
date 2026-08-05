import { Dialog } from '@/components/ui/dialog'
import { DELIVERY_OPTIONS, type DeliveryValue } from '@/components/CatalogOptionChips'

type Props = {
  onClose: () => void
}

// Buyer-facing explanations — distinct from the seller-facing copy in the
// catalog editor. Keyed by delivery value so it stays in sync with DELIVERY_OPTIONS.
const BUYER_INFO: Record<DeliveryValue, string> = {
  'location-pickup':
    'El vendedor no puede hacer envíos pero estará feliz de recibirte en su establecimiento o local.',
  delivery:
    'Informa que el vendedor puede hacer entregas informales por sus propios medios o con un repartidor.',
  shipping:
    'El vendedor enviará tu producto por un servicio de paquetería privado. Recuerda que esta opción podría incrementar los costos de venta.',
}

export function ShippingInfoDialog({ onClose }: Props) {
  return (
    <Dialog onClose={onClose} ariaLabel="Opciones de envío" title="Opciones de envío">
      <div className="flex flex-col gap-4 p-5">
        {DELIVERY_OPTIONS.map((o) => (
          <div key={o.value} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              {o.icon}
              {o.label}
            </div>
            <p className="text-sm text-muted-foreground">{BUYER_INFO[o.value]}</p>
          </div>
        ))}

        <p className="border-t pt-4 text-xs text-muted-foreground">
          Recuerda que Alkachof no gestiona ningún tipo de entrega o envío. Es
          responsabilidad del vendedor y del comprador aclarar el proceso para el pago y
          entrega de mercancía, productos y servicios.
        </p>
      </div>
    </Dialog>
  )
}
