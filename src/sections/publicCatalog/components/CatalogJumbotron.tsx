import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, HelpCircle, MapPin, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PayOptionChips, DeliveryOptionChips } from '@/components/CatalogOptionChips'
import { CatalogHeroImage } from '@/components/CatalogImage'
import { useAuth } from '@/sections/auth/useAuth'
import { useChat } from '@/sections/chat/useChat'
import { useToast } from '@/components/ui/useToast'
import { usePublicCatalog } from '../context/PublicCatalogContext'
import { useCatalogSubscription } from '../hooks/useCatalogSubscription'
import { useCatalogLocation } from '../hooks/useCatalogLocation'
import { ShippingInfoDialog } from './ShippingInfoDialog'
import { CatalogLocationDialog } from './CatalogLocationDialog'
import { resolveMediaUrl } from '@/lib/mediaUrl'

export function CatalogJumbotron() {
  // Owners can't message or subscribe to themselves; those buttons stay hidden
  // for them entirely (unlike the buy/ask/request actions, which stay visible
  // but blocked — see useOwnerGuard).
  const { catalog, isOwner } = usePublicCatalog()
  const { isAuthenticated } = useAuth()
  const { findChatWith } = useChat()
  const toast = useToast()
  const navigate = useNavigate()
  const [showShippingInfo, setShowShippingInfo] = useState(false)
  const [showLocation, setShowLocation] = useState(false)

  const { isSubscribed, isLoading: isSubLoading, isPending: isSubPending, toggle } =
    useCatalogSubscription(catalog?._id, isAuthenticated && !isOwner)
  // Null when the catalog has no usable coordinates — the pin is hidden entirely
  // rather than opening an empty map.
  const location = useCatalogLocation(catalog?._id)

  if (!catalog) return null

  async function handleSubscribe() {
    const wasSubscribed = isSubscribed
    try {
      await toggle()
      toast.success(
        wasSubscribed
          ? 'Dejaste de seguir este catálogo.'
          : '¡Listo! Te suscribiste y recibirás sus novedades.',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la acción.')
    }
  }

  // Reuse an existing conversation with this seller if one exists; otherwise
  // open an unsaved draft with an ice-breaker. Nothing is persisted here — the
  // chat is created only when the visitor actually sends (see ChatThreadPage).
  function handleContact() {
    if (!catalog) return
    const existing = findChatWith(catalog.userId)
    if (existing) {
      navigate(`/chats/${existing._id}`)
      return
    }
    navigate('/chats/new', {
      state: {
        toUserId: catalog.userId,
        toAlias: catalog.alias,
        prefill: '¡Hola! Vi tu catálogo en Alkachof y me gustaría recibir más información.',
      },
    })
  }

  return (
    <>
    {/* The head of the card. Flat stock and a printed rule — no gradient and no
        blurred orb: nothing in this world glows, and a gradient belongs to no
        material. The shop name is the seller's own rubber stamp, landed off
        square the way a hand-pressed one does. */}
    <section className="relative flex flex-col gap-4 rounded-xl border-2 border-ink bg-card p-5 text-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-2">
          <h1 className="stamp stamp-mark text-2xl">{catalog.alias}</h1>
          {catalog.welcomeText && (
            <p className="text-base text-foreground">{catalog.welcomeText}</p>
          )}
        </div>
        {location && (
          <button
            type="button"
            onClick={() => setShowLocation(true)}
            aria-label="Ver la ubicación en el mapa"
            className="shrink-0 rounded-xl border-2 border-ink bg-card p-2.5 text-foreground transition-colors press-ink"
          >
            <MapPin size={16} />
          </button>
        )}
      </div>

      {catalog.description && (
        <p className="text-sm text-muted-foreground">{catalog.description}</p>
      )}

      <CatalogHeroImage src={resolveMediaUrl(catalog.image)} alt={catalog.alias} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="folio uppercase tracking-wider">Pago</span>
          <div className="rule-line flex flex-wrap gap-1.5 pb-2">
            <PayOptionChips options={catalog.payOptions} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="folio uppercase tracking-wider">Envío</span>
            <button
              type="button"
              onClick={() => setShowShippingInfo(true)}
              aria-label="Información sobre opciones de envío"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <HelpCircle size={14} />
            </button>
          </div>
          <div className="rule-line flex flex-wrap gap-1.5 pb-2">
            <DeliveryOptionChips options={catalog.deliveryType} />
          </div>
        </div>
      </div>

      {isAuthenticated && !isOwner && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSubscribe}
            disabled={isSubLoading || isSubPending}
            aria-pressed={isSubscribed}
            aria-busy={isSubPending}
            className={cn(
              'flex items-center gap-2 rounded-xl border-2 border-ink px-5 py-2.5 text-sm font-semibold transition-[background-color] disabled:cursor-not-allowed',
              isSubscribed
                ? 'bg-primary text-primary-foreground press'
                : 'bg-card text-foreground press-ink',
            )}
          >
            {isSubscribed ? <BellRing size={14} /> : <Bell size={14} />}
            {isSubPending
              ? isSubscribed
                ? 'Cancelando…'
                : 'Suscribiendo…'
              : isSubscribed
                ? 'Suscrito'
                : 'Suscribirme'}
          </button>
          <button
            onClick={handleContact}
            className="flex items-center gap-2 rounded-xl border-2 border-ink bg-buy px-5 py-2.5 text-sm font-semibold text-buy-ink transition-[background-color] press-ink"
          >
            <MessageCircle size={14} />
            Contactar
          </button>
        </div>
      )}
    </section>

    {showShippingInfo && (
      <ShippingInfoDialog onClose={() => setShowShippingInfo(false)} />
    )}

    {showLocation && location && (
      <CatalogLocationDialog location={location} onClose={() => setShowLocation(false)} />
    )}
    </>
  )
}
