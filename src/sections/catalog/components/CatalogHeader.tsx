import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, ExternalLink, Banknote, CreditCard, ArrowLeftRight, CircleEllipsis, MapPin, Truck, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditCatalog } from '../context/EditCatalogContext'
import { EditCatalogModal } from './EditCatalogModal'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

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

export function CatalogHeader() {
  const { catalog } = useEditCatalog()
  const [editing, setEditing] = useState(false)

  if (!catalog) return null

  return (
    <>
      <section className="rounded-xl bg-primary p-6 text-primary-foreground flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold leading-tight">{catalog.alias}</h1>
            {catalog.welcomeText && (
              <p className="text-primary-foreground/80 text-base">{catalog.welcomeText}</p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            aria-label="Editar catálogo"
            className="shrink-0 rounded-full bg-primary-foreground/20 p-2 transition-colors hover:bg-primary-foreground/30"
          >
            <Pencil size={16} />
          </button>
        </div>

        {catalog.description && (
          <p className="text-sm text-primary-foreground/70">{catalog.description}</p>
        )}

        {catalog.location && (
          <p className="text-sm text-primary-foreground/60">{catalog.location}</p>
        )}

        {catalog.payOptions.length > 0 && (
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
        )}

        {catalog.deliveryType.length > 0 && (
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
        )}

        <Button
          asChild
          variant="outline"
          size="sm"
          className="self-start border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <Link to={`/catalog/${catalog._id}`}>
            <ExternalLink size={14} className="mr-1.5" />
            Ver catálogo
          </Link>
        </Button>
      </section>

      {editing && <EditCatalogModal onClose={() => setEditing(false)} />}
    </>
  )
}
