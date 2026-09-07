import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'

type Props = {
  /** ISO 8601 from the API, or null when the server sent no date. */
  until: string | null
  cooldownDays: number
  onClose: () => void
}

/**
 * The screen a seller gets when they have already spent their scraper run.
 *
 * Terminal, and deliberately without a retry button — the same reasoning as the
 * private-account notice, for a different reason. Reading the feed is a billed
 * Apify run and the API allows one per seller per cooldown, so there is nothing
 * a retry could accomplish before the date passes. A "Reintentar" here would be
 * a button whose only function is to fail.
 *
 * The date comes from the server on every path that reaches this screen
 * (`/status`, a 429, or the import that started the cooldown). It is never
 * computed here: the client's clock is not the one enforcing the gate, and a
 * screen that promised Tuesday while the API refused until Wednesday would be
 * worse than no date at all.
 */
export function InstagramCooldownNotice({ until, cooldownDays, onClose }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <CalendarClock size={24} className="text-muted-foreground" />
      </span>

      <p className="text-sm font-semibold">Ya importaste de Instagram esta semana.</p>

      <p className="text-sm text-muted-foreground">
        {until ? (
          <>
            Podrás importar de nuevo el <strong className="font-semibold">{formatDate(until)}</strong>.
          </>
        ) : (
          <>Podrás importar de nuevo más adelante.</>
        )}
      </p>

      {/*
        Says why, in the seller's terms rather than ours. "Leer tu Instagram
        tiene un costo" is the honest version — a limit with no reason reads as
        an arbitrary punishment, and this one exists so the feature can stay free.
      */}
      <p className="text-xs text-muted-foreground">
        Leer tus publicaciones de Instagram tiene un costo para nosotros, así que puedes importar
        una vez cada {cooldownDays} días. Mientras tanto, puedes agregar artículos a mano.
      </p>

      <Button size="sm" onClick={onClose}>
        Entendido
      </Button>
    </div>
  )
}
