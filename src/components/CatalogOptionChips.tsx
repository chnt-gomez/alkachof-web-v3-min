import { Banknote, CreditCard, ArrowLeftRight, CircleEllipsis, MapPin, Truck, Package } from 'lucide-react'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

const PAY_CHIPS: Record<Catalog['payOptions'][number], { icon: React.ReactNode; label: string }> = {
  cash:     { icon: <Banknote size={13} />,       label: 'Efectivo' },
  credit:   { icon: <CreditCard size={13} />,     label: 'Tarjeta de crédito' },
  transfer: { icon: <ArrowLeftRight size={13} />, label: 'Transferencia' },
  other:    { icon: <CircleEllipsis size={13} />, label: 'Otro' },
}

const DELIVERY_CHIPS: Record<Catalog['deliveryType'][number], { icon: React.ReactNode; label: string }> = {
  'location-pickup': { icon: <MapPin size={13} />,  label: 'Recoger en tienda' },
  delivery:          { icon: <Truck size={13} />,   label: 'Entrega a domicilio' },
  shipping:          { icon: <Package size={13} />, label: 'Envío a domicilio' },
}

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
