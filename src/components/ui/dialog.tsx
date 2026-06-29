import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type DialogProps = {
  open?: boolean
  onClose: () => void
  ariaLabel: string
  role?: 'dialog' | 'alertdialog'
  title?: ReactNode
  children: ReactNode
  className?: string
}

export function Dialog({
  open = true,
  onClose,
  ariaLabel,
  role = 'dialog',
  title,
  children,
  className,
}: DialogProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role={role}
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-md overflow-y-auto rounded-t-2xl bg-background max-h-[90vh] sm:rounded-2xl',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
