import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ProgressButton } from '@/components/ui/progressButton'
import { TRANSITION_ACTION_LABEL } from './transitions'

type Props = {
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Buyer confirms receipt of an order.
 *
 * This deliberately costs an extra tap. Confirming closes the order with no undo,
 * and the seller can offer no recourse after — only the buyer can truthfully state
 * that the goods arrived. Making it a two-step flow (tap "Confirmar recepción",
 * then confirm in the dialog) prevents mis-taps and keeps the experience intentional.
 */
export function ConfirmReceiptDialog({ pending, onConfirm, onClose }: Props) {
  return (
    <Dialog
      onClose={onClose}
      ariaLabel="Confirmar recepción"
      title="Confirmar recepción"
      className="max-w-md"
    >
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-muted-foreground">
          Al confirmar la recepción, informas al vendedor que recibiste tu pedido. Luego el pedido
          se marca como entregado y se cierra. Esta acción no se puede deshacer.
        </p>
      </div>

      <div className="flex gap-3 border-t px-5 py-4">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={pending}>
          Atrás
        </Button>
        <ProgressButton
          variant="default"
          className="flex-1"
          onClick={onConfirm}
          pending={pending}
          pendingLabel="Confirmando…"
          progressLabel="Confirmando la recepción del pedido"
        >
          {TRANSITION_ACTION_LABEL.DELIVERED}
        </ProgressButton>
      </div>
    </Dialog>
  )
}
