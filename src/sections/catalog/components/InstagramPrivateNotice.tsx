import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  alias: string
  onDismiss: () => void
}

/**
 * The dead end that Phyllo's OAuth flow never produced, and the most likely
 * first-run failure now: the account is private.
 *
 * It is **terminal for that account** — retrying changes nothing until the seller
 * changes a setting on Instagram — so there is no "Reintentar" here. Explaining
 * the fix, in the seller's own terms, is worth more than any retry button.
 */
export function InstagramPrivateNotice({ alias, onDismiss }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center"
    >
      <Lock size={24} className="text-muted-foreground" />
      <p className="text-sm font-semibold">La cuenta @{alias} es privada</p>
      <p className="text-sm text-muted-foreground">
        Para importar tus fotos, tu cuenta debe ser pública. Puedes cambiarla en Instagram →
        Configuración → Privacidad de la cuenta, y volver aquí.
      </p>
      <Button size="sm" variant="outline" onClick={onDismiss}>
        Elegir otra cuenta
      </Button>
    </div>
  )
}
