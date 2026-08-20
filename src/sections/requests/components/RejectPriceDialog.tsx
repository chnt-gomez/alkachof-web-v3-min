import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ProgressButton } from '@/components/ui/progressButton'
import { REQUEST_ACTION_LABEL } from './transitions'
import { NOTE_MAX_LENGTH } from '../types'

type Props = {
  /** The note as it stands — pre-filled and selected, so it can be replaced or kept. */
  currentNote: string
  /** True while the rejection is in flight; drives the button's progress bar. */
  pending: boolean
  onConfirm: (note: string) => void
  onClose: () => void
}

/**
 * Turning a quote down, with a chance to restate the job first.
 *
 * This one deliberately costs an extra tap. Rejecting sends the request back to
 * the seller for a fresh quote, and without a word about *why*, they re-quote
 * blind — guessing lower until something sticks. Putting the note in front of
 * the buyer at the moment they say no is the only point where they know what
 * they'd change, so the tap buys a better second quote.
 *
 * The note arrives pre-filled **and selected**: keeping it is a tap on the
 * button, replacing it is just typing. Editing it is the one case that costs
 * anything, and that is the case the dialog exists for.
 *
 * Sending the note unchanged is harmless — the server overwrites it with the
 * same string.
 */
export function RejectPriceDialog({ currentNote, pending, onConfirm, onClose }: Props) {
  const [note, setNote] = useState(currentNote)

  return (
    <Dialog
      onClose={onClose}
      ariaLabel="Rechazar precio"
      title="Rechazar precio"
      className="max-w-md"
    >
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-muted-foreground">
          Si no estás satisfecho con el precio, puedes rechazarlo y pedirle al vendedor que te haga una nueva oferta. Cuéntale tu presupuesto, tus necesidades o cualquier detalle que pueda ayudarle a ajustar su propuesta.
        </p>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="reject-price-note"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Detalles para el vendedor
          </label>
          <textarea
            id="reject-price-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
            rows={4}
            maxLength={NOTE_MAX_LENGTH}
            disabled={pending}
            autoFocus
            // Selected on open: the buyer overwrites by typing, or leaves it be.
            onFocus={(e) => e.target.select()}
            placeholder="Cuéntale qué necesitas: fechas, cantidad, tamaño, tu colonia…"
            className="w-full resize-none rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Puedes dejar la nota como está.
            </p>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {note.length}/{NOTE_MAX_LENGTH}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-t px-5 py-4">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={pending}>
          Atrás
        </Button>
        <ProgressButton
          variant="destructive"
          className="flex-1"
          onClick={() => onConfirm(note.trim())}
          pending={pending}
          pendingLabel="Enviando…"
          progressLabel="Rechazando el precio"
        >
          {REQUEST_ACTION_LABEL.REQUESTED}
        </ProgressButton>
      </div>
    </Dialog>
  )
}
