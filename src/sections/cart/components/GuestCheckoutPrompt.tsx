import { useNavigate, useLocation } from 'react-router-dom'
import { X, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  onClose: () => void
}

/**
 * Shown when a guest tries to check out. Rather than sending the order, we
 * encourage them to create an account (or sign in) — the return path is
 * preserved so they land back on the catalog after authenticating.
 */
export function GuestCheckoutPrompt({ onClose }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.pathname

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-overlay-fade sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-md flex-col overflow-y-auto rounded-t-2xl bg-background max-h-[90vh] animate-sheet-pop sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur-sm"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserPlus size={22} />
            </span>
            <h2 className="text-xl font-bold">Crea una cuenta para comprar</h2>
            <p className="text-sm text-muted-foreground">
              Necesitas una cuenta para completar tu pedido y dar seguimiento a tus compras.
              Regístrate para continuar; guardaremos tu carrito.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => navigate('/signup', { state: { from } })}
            >
              Crear cuenta
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login', { state: { from } })}
            >
              Ya tengo cuenta
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
