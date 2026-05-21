import { Banknote, CreditCard, ArrowLeftRight, CircleEllipsis, MapPin, Truck, Package, Bell } from 'lucide-react'
import { usePublicCatalog } from '../context/PublicCatalogContext'
import type { Catalog } from '../actions/fetchPublicCatalog'

function handleSubscribe() {
  // placeholder
}

const PAY_ICONS: Record<Catalog['payOptions'][number], { icon: React.ReactNode; label: string }> = {
  cash:     { icon: <Banknote size={14} />,       label: 'Efectivo' },
  credit:   { icon: <CreditCard size={14} />,     label: 'Tarjeta de crédito' },
  transfer: { icon: <ArrowLeftRight size={14} />, label: 'Transferencia' },
  other:    { icon: <CircleEllipsis size={14} />, label: 'Otro' },
}

const DELIVERY_ICONS: Record<Catalog['deliveryType'][number], { icon: React.ReactNode; label: string }> = {
  'location-pickup': { icon: <MapPin size={14} />,  label: 'Recoger en tienda' },
  delivery:          { icon: <Truck size={14} />,   label: 'Entrega a domicilio' },
  shipping:          { icon: <Package size={14} />, label: 'Envío a domicilio' },
}

export function CatalogJumbotron() {
  const { catalog } = usePublicCatalog()

  if (!catalog) return null

  return (
    <section className="rounded-xl bg-primary p-6 text-primary-foreground flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold leading-tight">{catalog.alias}</h1>
        {catalog.welcomeText && (
          <p className="text-primary-foreground/80 text-base">{catalog.welcomeText}</p>
        )}
      </div>

      {catalog.description && (
        <p className="text-sm text-primary-foreground/70">{catalog.description}</p>
      )}

      {catalog.location && (
        <p className="text-sm text-primary-foreground/60">{catalog.location}</p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-primary-foreground/60">
            Pago
          </span>
          <div className="flex flex-wrap gap-2">
            {catalog.payOptions.map((opt) => (
              <span
                key={opt}
                className="flex items-center rounded-full bg-primary-foreground/20 p-2"
                title={PAY_ICONS[opt]?.label ?? opt}
              >
                {PAY_ICONS[opt]?.icon ?? <CircleEllipsis size={14} />}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-primary-foreground/60">
            Envío
          </span>
          <div className="flex flex-wrap gap-2">
            {catalog.deliveryType.map((opt) => (
              <span
                key={opt}
                className="flex items-center rounded-full bg-primary-foreground/20 p-2"
                title={DELIVERY_ICONS[opt]?.label ?? opt}
              >
                {DELIVERY_ICONS[opt]?.icon ?? <Package size={14} />}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSubscribe}
        className="flex items-center gap-2 self-start rounded-full bg-primary-foreground/20 px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/30"
      >
        <Bell size={14} />
        Suscribirme
      </button>
    </section>
  )
}
