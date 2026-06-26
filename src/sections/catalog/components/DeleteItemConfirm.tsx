import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

type Props = {
  itemName: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function DeleteItemConfirm({ itemName, onConfirm, onClose }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setDeleting(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.')
      setDeleting(false)
    }
  }

  return (
    <Dialog
      role="alertdialog"
      ariaLabel="Confirmar eliminación"
      onClose={deleting ? () => {} : onClose}
      className="max-w-sm"
    >
      <div className="flex flex-col gap-2 px-5 py-5">
        <h2 className="text-base font-semibold">¿Eliminar producto?</h2>
        <p className="text-sm text-muted-foreground">
          Vas a eliminar <span className="font-medium">{itemName || 'este producto'}</span>. Esta acción no se puede deshacer.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-3 border-t px-5 py-4">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={deleting}>
          Cancelar
        </Button>
        <Button variant="destructive" className="flex-1" onClick={handleConfirm} disabled={deleting}>
          {deleting ? 'Eliminando…' : 'Eliminar'}
        </Button>
      </div>
    </Dialog>
  )
}
