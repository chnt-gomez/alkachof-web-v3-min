import { useState } from 'react'
import { Button } from '@/components/ui/button'

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={deleting ? undefined : onClose}
    >
      <div
        role="alertdialog"
        aria-label="Confirmar eliminación"
        className="relative w-full max-w-sm rounded-t-2xl bg-background sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
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
      </div>
    </div>
  )
}
