import { MapPin, Bell } from 'lucide-react'
import { PayOptionChips, DeliveryOptionChips } from '@/components/CatalogOptionChips'
import { usePublicCatalog } from '../context/PublicCatalogContext'

function handleSubscribe() {
  // placeholder
}

export function CatalogJumbotron() {
  const { catalog } = usePublicCatalog()

  if (!catalog) return null

  return (
    <section className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-deep p-6 text-primary-foreground shadow-lg shadow-primary/20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary-foreground/10 blur-2xl"
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold leading-tight">{catalog.alias}</h1>
        {catalog.welcomeText && (
          <p className="text-base text-primary-foreground/80">{catalog.welcomeText}</p>
        )}
      </div>

      {catalog.description && (
        <p className="text-sm text-primary-foreground/70">{catalog.description}</p>
      )}

      {catalog.location && (
        <p className="flex items-center gap-1.5 text-sm text-primary-foreground/70">
          <MapPin size={14} className="shrink-0" />
          {catalog.location}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/60">
            Pago
          </span>
          <div className="flex flex-wrap gap-1.5">
            <PayOptionChips options={catalog.payOptions} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/60">
            Envío
          </span>
          <div className="flex flex-wrap gap-1.5">
            <DeliveryOptionChips options={catalog.deliveryType} />
          </div>
        </div>
      </div>

      <button
        onClick={handleSubscribe}
        className="flex items-center gap-2 self-start rounded-full bg-primary-foreground px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition-transform active:scale-[0.97]"
      >
        <Bell size={14} />
        Suscribirme
      </button>
    </section>
  )
}
