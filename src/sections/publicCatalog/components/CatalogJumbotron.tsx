import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, HelpCircle, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PayOptionChips, DeliveryOptionChips } from '@/components/CatalogOptionChips'
import { useAuth } from '@/sections/auth/useAuth'
import { useChat } from '@/sections/chat/useChat'
import { useToast } from '@/components/ui/useToast'
import { usePublicCatalog } from '../context/PublicCatalogContext'
import { useCatalogSubscription } from '../hooks/useCatalogSubscription'
import { CatalogLocationCard } from './CatalogLocationCard'
import { ShippingInfoDialog } from './ShippingInfoDialog'

export function CatalogJumbotron() {
  const { catalog } = usePublicCatalog()
  const { isAuthenticated, profile } = useAuth()
  const { findChatWith } = useChat()
  const toast = useToast()
  const navigate = useNavigate()
  const [showShippingInfo, setShowShippingInfo] = useState(false)

  // Owners can't message or subscribe to themselves; the buttons only show for
  // other users. Computed before the early return so the hooks below stay
  // unconditional.
  const isOwner = profile?.userId === catalog?.userId
  const { isSubscribed, isLoading: isSubLoading, isPending: isSubPending, toggle } =
    useCatalogSubscription(catalog?._id, isAuthenticated && !isOwner)

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

      <CatalogLocationCard catalogId={catalog._id} />

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
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/60">
              Envío
            </span>
            <button
              type="button"
              onClick={() => setShowShippingInfo(true)}
              aria-label="Información sobre opciones de envío"
              className="text-primary-foreground/60 transition-colors hover:text-primary-foreground"
            >
              <HelpCircle size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
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
              'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60',
              isSubscribed
                ? 'border border-primary-foreground/40 bg-transparent text-primary-foreground'
                : 'bg-primary-foreground text-primary',
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
            className="flex items-center gap-2 rounded-full border border-primary-foreground/40 px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
          >
            <MessageCircle size={14} />
            Contactar
          </button>
        </div>
      )}
    </section>

    {/* Rendered outside the section so it doesn't inherit its white text color */}
    {showShippingInfo && (
      <ShippingInfoDialog onClose={() => setShowShippingInfo(false)} />
    )}
    </>
  )
}
