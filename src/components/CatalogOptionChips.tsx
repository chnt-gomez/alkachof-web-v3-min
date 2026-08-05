import { Banknote, CreditCard, ArrowLeftRight, CircleEllipsis, MapPin, Truck, Package } from 'lucide-react'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

const PAY_CHIPS: Record<Catalog['payOptions'][number], { icon: React.ReactNode; label: string }> = {
  cash:     { icon: <Banknote size={13} />,       label: 'Efectivo' },
  credit:   { icon: <CreditCard size={13} />,     label: 'Tarjeta de crédito' },
  transfer: { icon: <ArrowLeftRight size={13} />, label: 'Transferencia' },
  other:    { icon: <CircleEllipsis size={13} />, label: 'Otro' },
}

export type DeliveryValue = Catalog['deliveryType'][number]

// Single source of truth for delivery option display metadata — consumed by the
// chips below, the owner catalog editor, and the shipping-info help modal.
export const DELIVERY_OPTIONS: Array<{
  value: DeliveryValue
  icon: React.ReactNode
  label: string
  description?: string
}> = [
  { value: 'location-pickup', icon: <MapPin size={13} />, label: 'Recoger en tienda' },
  {
    value: 'delivery',
    icon: <Truck size={13} />,
    label: 'Entrega a domicilio',
    description:
      'Tú entregarás personalmente los productos en el domicilio de tu cliente. Usualmente esta opción no representa ningún costo adicional a tus clientes.',
  },
  {
    value: 'shipping',
    icon: <Package size={13} />,
    label: 'Envío a domicilio',
    description:
      'Usarás un servicio externo de paquetería para enviar tus productos. Esta opción podría incrementar tus costos de venta, así que asegúrate de convenir un costo de envío con tus clientes.',
  },
]

const DELIVERY_CHIPS = Object.fromEntries(
  DELIVERY_OPTIONS.map((o) => [o.value, o]),
) as Record<DeliveryValue, (typeof DELIVERY_OPTIONS)[number]>

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium">
      {icon}
      {label}
    </span>
  )
}

export function PayOptionChips({ options }: { options: Catalog['payOptions'] }) {
  return options.map((opt) => {
    const chip = PAY_CHIPS[opt] ?? { icon: <CircleEllipsis size={13} />, label: opt }
    return <Chip key={opt} icon={chip.icon} label={chip.label} />
  })
}

export function DeliveryOptionChips({ options }: { options: Catalog['deliveryType'] }) {
  return options.map((opt) => {
    const chip = DELIVERY_CHIPS[opt] ?? { icon: <Package size={13} />, label: opt }
    return <Chip key={opt} icon={chip.icon} label={chip.label} />
  })
}
