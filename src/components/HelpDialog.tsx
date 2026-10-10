import { Mail } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'

const SUPPORT_EMAIL = 'admin@alkachof.mx'

type Props = {
  onClose: () => void
}

export function HelpDialog({ onClose }: Props) {
  return (
    <Dialog onClose={onClose} ariaLabel="Ayuda y contacto" title="¿Necesitas ayuda?">
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-muted-foreground">
          Gracias por usar Alkachof. Si tienes dudas o
          problemas, escríbenos:
        </p>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-3 rounded-xl border-2 border-ink p-3 transition-colors hover:bg-secondary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Mail size={18} />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold">Correo</span>
            <span className="text-sm text-muted-foreground">{SUPPORT_EMAIL}</span>
          </span>
        </a>
      </div>
    </Dialog>
  )
}
