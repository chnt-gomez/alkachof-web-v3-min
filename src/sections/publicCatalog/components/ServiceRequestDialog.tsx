import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProgressButton } from '@/components/ui/progressButton'
import { Dialog } from '@/components/ui/dialog'
import { formatItemPrice } from '@/lib/format'
// The note is a request field, so its cap lives with the request domain — the
// rejection dialog writes the same field and must not disagree about the limit.
import { NOTE_MAX_LENGTH } from '@/sections/requests/types'
import type { Item } from '../actions/fetchCatalogItems'

type Props = {
  item: Item
  onSubmit: (note: string) => Promise<void>
  onClose: () => void
}

/**
 * Collects the buyer's note before a service request goes out.
 *
 * A service usually has no price until the seller quotes it, and the seller
 * cannot quote without knowing what the job actually is ("¿cuántas ventanas?",
 * "¿a qué colonia?"). The note is that context, so it sits on the request
 * rather than arriving as a separate message afterwards.
 *
 * Optional on purpose: a buyer who just wants to start a conversation should
 * not be blocked by a required field. The placeholder does the encouraging.
 */
export function ServiceRequestDialog({ item, onSubmit, onClose }: Props) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const quoteOnRequest = item.price === 0

  // Booking twice creates two requests server-side (there is no find-or-create),
  // so the button locks for the whole round trip.
  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit(note.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog onClose={onClose} ariaLabel="Solicitar servicio" title="Solicitar servicio">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">{item.name}</p>
          <p className="text-sm text-primary">{formatItemPrice(item)}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="service-request-note"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Detalles para el vendedor
          </label>
          <textarea
            id="service-request-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
            rows={4}
            maxLength={NOTE_MAX_LENGTH}
            disabled={submitting}
            placeholder="Cuéntale qué necesitas: fechas, cantidad, tamaño, tu colonia… Entre más claro seas, mejor podrá cotizarte."
            className="w-full resize-none rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {quoteOnRequest
                ? 'El vendedor usará estos datos para darte un precio.'
                : 'Opcional, pero ayuda al vendedor a preparar tu servicio.'}
            </p>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {note.length}/{NOTE_MAX_LENGTH}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-t px-5 py-4">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <ProgressButton
          className="flex-1"
          onClick={handleSubmit}
          pending={submitting}
          pendingLabel="Enviando…"
          progressLabel="Enviando la solicitud"
        >
          Enviar solicitud
        </ProgressButton>
      </div>
    </Dialog>
  )
}
