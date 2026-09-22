import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, ExternalLink, MapPin, Megaphone, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PayOptionChips, DeliveryOptionChips } from '@/components/CatalogOptionChips'
import { CatalogHeroImage } from '@/components/CatalogImage'
import { useEditCatalog } from '../context/EditCatalogContext'
import { EditCatalogScreen } from './EditCatalogScreen'
import { ShareCatalogDialog } from './ShareCatalogDialog'
import { AnnounceDialog, formatAvailableAt } from './AnnounceDialog'
import { resolveMediaUrl } from '@/lib/mediaUrl'

export function CatalogHeader() {
  const { catalog, items } = useEditCatalog()
  const [editing, setEditing] = useState(false)
  const [announcing, setAnnouncing] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null)

  if (!catalog) return null

  const onCooldown = cooldownUntil !== null && new Date(cooldownUntil).getTime() > Date.now()

  return (
    <>
      <section className="relative flex flex-col gap-4 rounded-xl border-2 border-ink bg-card p-5 text-foreground">

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="stamp stamp-mark text-2xl">{catalog.alias}</h1>
            {catalog.welcomeText && (
              <p className="text-base text-foreground">{catalog.welcomeText}</p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            aria-label="Editar catálogo"
            className="relative shrink-0 rounded-xl border-2 border-ink bg-card p-2.5 text-foreground transition-[background-color] press-ink"
          >
            <Pencil size={16} />
          </button>
        </div>

        {catalog.description && (
          <p className="text-sm text-muted-foreground">{catalog.description}</p>
        )}

        <CatalogHeroImage
          src={resolveMediaUrl(catalog.image)}
          alt={catalog.alias}
          hint="Toca el lápiz para agregar una imagen a tu catálogo."
        />

        {catalog.location && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin size={14} className="shrink-0" />
            {catalog.location}
          </p>
        )}

        {catalog.payOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="folio uppercase tracking-wider">
              Pago
            </span>
            <div className="flex flex-wrap gap-1.5">
              <PayOptionChips options={catalog.payOptions} />
            </div>
          </div>
        )}

        {catalog.deliveryType.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="folio uppercase tracking-wider">
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
            className="border-2 border-ink bg-primary text-primary-foreground press"
          >
            <Link to={`/catalog/${catalog._id}`}>
              <ExternalLink size={14} />
              Ver catálogo
            </Link>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setSharing(true)}
            className="border-2 border-ink bg-card text-foreground press-ink"
          >
            <Share2 size={14} />
            Compartir
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setAnnouncing(true)}
            disabled={onCooldown}
            className="border-2 border-ink bg-card text-foreground press-ink"
          >
            <Megaphone size={14} />
            Anunciar
          </Button>
        </div>

        {onCooldown && cooldownUntil && (
          <p className="text-xs text-muted-foreground">
            Próximo anuncio disponible {formatAvailableAt(cooldownUntil)}.
          </p>
        )}
      </section>

      {editing && <EditCatalogScreen onClose={() => setEditing(false)} />}

      {sharing && (
        <ShareCatalogDialog
          catalogId={catalog._id}
          catalogName={catalog.alias}
          qr={catalog.qr}
          onClose={() => setSharing(false)}
        />
      )}

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
