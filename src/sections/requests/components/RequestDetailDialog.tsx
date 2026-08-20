import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { ProgressButton } from '@/components/ui/progressButton'
import { formatDate } from '@/lib/format'
import { withMinDuration } from '@/lib/pendingAction'
import { useChat } from '@/sections/chat/useChat'
import { updateRequestStatus } from '../actions/updateRequestStatus'
import { RejectPriceDialog } from './RejectPriceDialog'
import { RequestStatusBadge } from './RequestStatusBadge'
import { formatRequestPrice } from './formatRequestPrice'
import { requestSubheader } from './requestSubheader'
import { requestStatusHint } from './statusMeta'
import { acceptsNote, allowedTransitions, requiresPrice, REQUEST_ACTION_LABEL } from './transitions'
import type { RequestRole, RequestStatus, ServiceRequest, ServiceRequestRow } from '../types'

type Props = {
  row: ServiceRequestRow
  role: RequestRole
  /** Called after a successful change so the list can reflect it. */
  onUpdated: (updated: ServiceRequest) => void
  onClose: () => void
}

/** Parses a pesos input into cents. The API requires a positive integer. */
function parsePesos(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const parsed = parseFloat(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100)
}

/** Moves that end the request, styled as destructive. */
const DESTRUCTIVE: RequestStatus[] = ['REJECTED', 'CANCELED']

export function RequestDetailDialog({ row, role, onUpdated, onClose }: Props) {
  const navigate = useNavigate()
  const { findChatWith } = useChat()

  // Track status and price locally so the dialog updates in place after a
  // change, without closing or refetching.
  const [status, setStatus] = useState<RequestStatus>(row.status)
  const [finalPrice, setFinalPrice] = useState<number | null>(row.finalPrice)
  const [pending, setPending] = useState<RequestStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The price input is always on screen for a seller who can quote: pricing is
  // the whole reason they opened this, and hiding it behind a reveal only added
  // a tap between reading the buyer's note and answering it.
  const [priceInput, setPriceInput] = useState('')

  // The note travels with a rejection, so that move gets its own dialog (see
  // RejectPriceDialog). It also owns the note the request now carries, since a
  // rejection can rewrite it.
  const [rejecting, setRejecting] = useState(false)
  const [customerNote, setCustomerNote] = useState(row.customerNote)

  const counterpartyId = role === 'buyer' ? row.sellerId : row.buyerId
  const nextStatuses = allowedTransitions(status, role)
  const hint = requestStatusHint(status, role)

  const openChat = useCallback(() => {
    const existing = findChatWith(counterpartyId)
    if (existing) {
      navigate(`/chats/${existing._id}`)
      return
    }
    navigate('/chats/new', {
      state: {
        toUserId: counterpartyId,
        toAlias: row.serviceName,
        prefill:
          role === 'buyer'
            ? `¡Hola! Te escribo sobre mi solicitud de ${row.serviceName}.`
            : `¡Hola! Te escribo sobre tu solicitud de ${row.serviceName}.`,
      },
    })
  }, [findChatWith, navigate, counterpartyId, row.serviceName, role])

  const apply = useCallback(
    async (next: RequestStatus, price?: number, note?: string) => {
      setPending(next)
      setError(null)
      try {
        // Every move here books, prices or cancels real work — held at the
        // standard pace so it can't be double-tapped or missed.
        const updated = await withMinDuration(updateRequestStatus(row.id, next, price, note))
        // Trust the server's echo rather than the value we sent: turning a
        // quote down clears finalPrice, a note sent on the wrong transition is
        // ignored, and after ACCEPTED a price is ignored too.
        setStatus(updated.status)
        setFinalPrice(updated.finalPrice)
        setCustomerNote(updated.customerNote)
        setPriceInput('')
        setRejecting(false)
        onUpdated(updated)
      } catch {
        // A 400 here means "illegal from this status or not your role", which
        // in practice means the screen is stale — so say so.
        setError('No pudimos actualizar la solicitud. Actualiza la lista e inténtalo de nuevo.')
      } finally {
        setPending(null)
      }
    },
    [row.id, onUpdated],
  )

  function submitPrice() {
    const cents = parsePesos(priceInput)
    if (cents === null) {
      setError('Escribe un precio mayor a cero.')
      return
    }
    void apply('PRICED', cents)
  }

  // Quoting carries an amount, so it renders as the input + its own submit
  // rather than as one of the plain status buttons.
  const plainTransitions = nextStatuses.filter((next) => !requiresPrice(next))
  const canQuote = nextStatuses.some(requiresPrice)

  // The rejection dialog replaces this one rather than stacking on it: two
  // overlays would double the scrim on a phone, and both Dialogs listen for
  // Escape on the window, so one press would close the pair. Closing it brings
  // this view back with its state intact.
  if (rejecting) {
    return (
      <RejectPriceDialog
        currentNote={customerNote}
        pending={pending === 'REQUESTED'}
        onConfirm={(note) => void apply('REQUESTED', undefined, note)}
        onClose={() => setRejecting(false)}
      />
    )
  }

  return (
    <Dialog onClose={onClose} ariaLabel="Detalle de la solicitud" title="Detalle de la solicitud">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-lg font-semibold">{row.serviceName}</p>
            {/* Same line as the card it was opened from, worded identically. */}
            <p className="truncate text-sm text-muted-foreground">
              {requestSubheader(row, role)}
            </p>
          </div>
          <button
            type="button"
            onClick={openChat}
            aria-label={
              role === 'buyer' ? 'Enviar mensaje al vendedor' : 'Enviar mensaje al comprador'
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MessageCircle size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <RequestStatusBadge status={status} />
          <time dateTime={row.dateCreated} className="text-xs text-muted-foreground">
            {formatDate(row.dateCreated)}
          </time>
        </div>

        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}

        {/* The buyer's brief is the seller's only context for pricing, so it
            sits above the actions rather than folded away. Omitted when empty. */}
        {customerNote && (
          <div className="flex flex-col gap-1 rounded-xl border bg-muted/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {role === 'seller' ? 'Detalles del comprador' : 'Tus detalles'}
            </p>
            <p className="whitespace-pre-line text-sm">{customerNote}</p>
          </div>
        )}

        {/* Only shown once there is a price. Before that the row said "Precio a
            convenir", which is the absence of information dressed up as a fact —
            the seller is here to set the number, not to read that it is unset. */}
        {finalPrice !== null && (
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm font-medium text-muted-foreground">Precio</span>
            <span className="text-lg font-bold text-primary">
              {formatRequestPrice(finalPrice)}
            </span>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Seller-side quoting. Moving to PRICED *is* the quote, so the amount
            is collected here and the button sends it — one tap, with the
            buyer's note still in view above. Only reachable from REQUESTED; a
            turned-down quote comes back here for a fresh one. */}
        {canQuote && (
          <div className="flex flex-col gap-2 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Fija el precio de tus servicios con la información de la nota de tu cliente.
            </p>
            <label
              htmlFor="request-final-price"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Precio del servicio (pesos)
            </label>
            <input
              id="request-final-price"
              className="input"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="Ej. 350"
              inputMode="decimal"
            />
            <ProgressButton
              onClick={submitPrice}
              disabled={pending !== null}
              pending={pending === 'PRICED'}
              pendingLabel="Enviando…"
              progressLabel="Fijando el precio"
            >
              {REQUEST_ACTION_LABEL.PRICED}
            </ProgressButton>
          </div>
        )}

        {plainTransitions.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-3">
            <span className="text-sm font-medium text-muted-foreground">Acciones</span>
            <div className="flex flex-wrap gap-2">
              {plainTransitions.map((next) => (
                <ProgressButton
                  key={next}
                  size="sm"
                  variant={DESTRUCTIVE.includes(next) ? 'destructive' : 'default'}
                  disabled={pending !== null}
                  // Rejecting carries a note, so it opens its own dialog and
                  // the call happens there; every other move fires here.
                  onClick={() => (acceptsNote(next) ? setRejecting(true) : apply(next))}
                  pending={pending === next}
                  pendingLabel="Actualizando…"
                  progressLabel={`${REQUEST_ACTION_LABEL[next]}: actualizando la solicitud`}
                >
                  {REQUEST_ACTION_LABEL[next]}
                </ProgressButton>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
