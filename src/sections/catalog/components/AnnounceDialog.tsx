import { useState } from 'react'
import { Megaphone, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/useToast'
import { cn } from '@/lib/utils'
import { broadcastCatalog } from '../actions/broadcastCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

const MESSAGE_MAX = 280

type Props = {
  catalogId: string
  items: Item[]
  /** Called with the ISO timestamp when the next announcement becomes available. */
  onCooldown: (availableAt: string) => void
  onClose: () => void
}

export function AnnounceDialog({ catalogId, items, onCooldown, onClose }: Props) {
  const toast = useToast()
  const [message, setMessage] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = message.trim()
  const canSend = trimmed.length > 0 && trimmed.length <= MESSAGE_MAX && !sending

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setError(null)

    const result = await broadcastCatalog(catalogId, trimmed, selectedItemId)

    if (result.ok) {
      toast.success('Tus suscriptores han sido notificados.')
      onCooldown(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      onClose()
      return
    }

    switch (result.reason) {
      case 'cooldown':
        onCooldown(result.availableAt)
        setError(
          `Ya enviaste un anuncio hoy. Podrás enviar otro ${formatAvailableAt(result.availableAt)}.`,
        )
        break
      case 'invalid':
        setError(result.message)
        break
      case 'forbidden':
        setError('Solo puedes anunciar tu propio catálogo.')
        break
      case 'unauthenticated':
        toast.error('Tu sesión expiró. Inicia sesión de nuevo.')
        setError('Tu sesión expiró. Inicia sesión de nuevo.')
        break
      default:
        setError(result.message)
    }
    setSending(false)
  }

  return (
    <Dialog onClose={onClose} ariaLabel="Anunciar a suscriptores" title="Anunciar a suscriptores">
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-muted-foreground">
          Envía un aviso a todos los suscriptores de tu catálogo. Solo puedes enviar uno cada 24 horas.
        </p>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="announce-message"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Mensaje
          </label>
          <textarea
            id="announce-message"
            className="input min-h-[96px] resize-none"
            value={message}
            maxLength={MESSAGE_MAX}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ej. ¡Nuevos productos disponibles esta semana! 🎉"
          />
          <span
            className={cn(
              'self-end text-xs text-muted-foreground',
              trimmed.length > MESSAGE_MAX && 'text-destructive',
            )}
          >
            {trimmed.length}/{MESSAGE_MAX}
          </span>
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Producto (opcional)
            </span>
            <ul className="flex gap-2 overflow-x-auto pb-1">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedItemId(null)}
                  aria-pressed={selectedItemId === null}
                  className={cn(
                    'flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border text-xs text-muted-foreground',
                    selectedItemId === null ? 'border-primary bg-primary/5' : 'border-input',
                  )}
                >
                  Ninguno
                </button>
              </li>
              {items.map((item) => {
                const selected = selectedItemId === item._id
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(item._id)}
                      aria-pressed={selected}
                      aria-label={item.name || 'Producto sin nombre'}
                      className={cn(
                        'relative flex h-20 w-20 shrink-0 flex-col overflow-hidden rounded-xl border',
                        selected ? 'border-primary ring-2 ring-primary' : 'border-input',
                      )}
                    >
                      {item.imgPath ? (
                        <img
                          src={item.imgPath}
                          alt={item.name || 'Producto'}
                          className="h-full w-full object-contain bg-muted"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-muted px-1 text-center text-[10px] text-muted-foreground">
                          {item.name || 'Sin imagen'}
                        </span>
                      )}
                      {selected && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check size={11} />
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="border-t px-5 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3 border-t px-5 py-4">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>
          Cancelar
        </Button>
        <Button className="flex-1" onClick={handleSend} disabled={!canSend}>
          <Megaphone size={16} />
          {sending ? 'Enviando…' : 'Enviar anuncio'}
        </Button>
      </div>
    </Dialog>
  )
}

/** Format an ISO timestamp as a friendly local time, e.g. "mañana a las 9:30 a.m.". */
export function formatAvailableAt(iso: string): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
  const isTomorrow = date.getDate() !== new Date().getDate()
  return isTomorrow ? `mañana a las ${time}` : `a las ${time}`
}
