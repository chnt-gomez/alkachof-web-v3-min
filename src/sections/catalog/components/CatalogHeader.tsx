import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, ExternalLink, MapPin, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PayOptionChips, DeliveryOptionChips } from '@/components/CatalogOptionChips'
import { useEditCatalog } from '../context/EditCatalogContext'
import { EditCatalogModal } from './EditCatalogModal'
import { AnnounceDialog, formatAvailableAt } from './AnnounceDialog'

export function CatalogHeader() {
  const { catalog, items } = useEditCatalog()
  const [editing, setEditing] = useState(false)
  const [announcing, setAnnouncing] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null)

  if (!catalog) return null

  const onCooldown = cooldownUntil !== null && new Date(cooldownUntil).getTime() > Date.now()

  return (
    <>
      <section className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-deep p-6 text-primary-foreground shadow-lg shadow-primary/20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary-foreground/10 blur-2xl"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold leading-tight">{catalog.alias}</h1>
            {catalog.welcomeText && (
              <p className="text-base text-primary-foreground/80">{catalog.welcomeText}</p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            aria-label="Editar catálogo"
            className="relative shrink-0 rounded-full bg-primary-foreground/20 p-2.5 transition-colors hover:bg-primary-foreground/30 active:scale-95"
          >
            <Pencil size={16} />
          </button>
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

        {catalog.payOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/60">
              Pago
            </span>
            <div className="flex flex-wrap gap-1.5">
              <PayOptionChips options={catalog.payOptions} />
            </div>
          </div>
        )}

        {catalog.deliveryType.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/60">
              Envío
            </span>
            <div className="flex flex-wrap gap-1.5">
              <DeliveryOptionChips options={catalog.deliveryType} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            className="bg-primary-foreground text-primary shadow-sm hover:bg-primary-foreground/90"
          >
            <Link to={`/catalog/${catalog._id}`}>
              <ExternalLink size={14} />
              Ver catálogo
            </Link>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setAnnouncing(true)}
            disabled={onCooldown}
            className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
          >
            <Megaphone size={14} />
            Anunciar
          </Button>
        </div>

        {onCooldown && cooldownUntil && (
          <p className="text-xs text-primary-foreground/70">
            Próximo anuncio disponible {formatAvailableAt(cooldownUntil)}.
          </p>
        )}
      </section>

      {editing && <EditCatalogModal onClose={() => setEditing(false)} />}

      {announcing && (
        <AnnounceDialog
          catalogId={catalog._id}
          items={items}
          onCooldown={setCooldownUntil}
          onClose={() => setAnnouncing(false)}
        />
      )}
    </>
  )
}
