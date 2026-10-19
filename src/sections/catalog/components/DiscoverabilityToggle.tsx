import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { useToast } from '@/components/ui/useToast'
import { hasValidCoords } from '@/sections/publicCatalog/hooks/useCatalogLocation'
import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import { setCatalogDiscoverable, isMissingLocationError } from '../actions/setCatalogDiscoverable'

type Props = {
  catalogId: string
  /** The raw stored location, or `null` when the catalog has none. */
  location: CatalogLocation | null
  /**
   * True when a save in this session gave the catalog its first usable pin.
   * Enables the invitation line — see `EditCatalogScreen` for why it is that
   * moment and not every address save.
   */
  justBecamePlaceable?: boolean
}

/**
 * The seller's opt-in to `/map`. Contract:
 * `docs.OptInMapDiscoverable.frontend.md`.
 *
 * It writes immediately on tap, like the catalog image and unlike the fields
 * around it — which is why it lives here in the editor rather than inside
 * `LocationEditDialog`, whose *Cancelar* button would be lying about one of its
 * controls.
 *
 * **It renders in all three states, disabled included.** A hidden control
 * teaches nobody that the map exists; a visible disabled one, beside the
 * "Agregar ubicación" button that fixes it, teaches both facts at once.
 */
export function DiscoverabilityToggle({ catalogId, location, justBecamePlaceable }: Props) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const on = location?.is_discoverable === true
  // Courtesy, not enforcement — the same arrangement as `remainingCatalogSlots`
  // against the server's own refusal. It saves a round trip for the case this
  // client can see; the 409 below is what actually decides.
  const placed = location !== null && hasValidCoords(location)
  // Turning it OFF is never gated: a seller must be able to leave the map from
  // any state, including the broken ones they would most want out of. The API
  // takes the same position, so this mirrors it rather than inventing a rule.
  const disabled = pending || (!on && !placed)

  async function handleToggle(next: boolean) {
    if (!location) return
    const key = queryKeys.catalogLocation(catalogId)
    // The cache, not the render: a flip that races a refetch must roll back to
    // the row that was current when it started. Same shape as
    // `EditCatalogContext.updateCatalog`.
    const previous = queryClient.getQueryData<CatalogLocation>(key)
    if (!previous) return

    setPending(true)
    setError(null)
    queryClient.setQueryData<CatalogLocation>(key, { ...previous, is_discoverable: next })
    try {
      const updated = await setCatalogDiscoverable(previous._id, next)
      // The API's own answer, written straight in — no refetch to confirm it.
      queryClient.setQueryData<CatalogLocation>(key, updated)
      // The switch moved before the request left, so this is the only thing
      // that separates a write that landed from one that vanished.
      toast.success(next ? 'Ya apareces en el mapa.' : 'Ya no apareces en el mapa.')
    } catch (err) {
      queryClient.setQueryData<CatalogLocation>(key, previous)
      // Our own Spanish, keyed off the status. The API's message is English and
      // this is the one failure a seller can actually cause.
      setError(
        isMissingLocationError(err)
          ? 'Agrega una ubicación en el mapa antes de aparecer.'
          : 'No se pudo cambiar tu visibilidad en el mapa.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-t-2 border-border pt-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Permitir que me encuentren en el mapa
      </label>

      <p className="pl-6 text-xs text-muted-foreground">
        {!placed && !on
          ? 'Agrega una ubicación con un punto en el mapa para poder aparecer.'
          : on
            ? 'Tu catálogo aparece cuando alguien busca catálogos cerca de tu ubicación.'
            : 'Tu catálogo no aparece en el mapa. Tu enlace y tu código QR siguen funcionando igual.'}
      </p>

      {/* The opt-in is never automatic — the feature is named for the opt, and a
          new location is created with the flag off. This is the invitation. */}
      {justBecamePlaceable && placed && !on && !pending && (
        <p className="pl-6 text-xs font-medium text-foreground">
          Ya tienes ubicación. ¿Quieres que te encuentren en el mapa?
        </p>
      )}

      {pending && <p className="pl-6 text-xs text-muted-foreground">Guardando…</p>}

      {error && (
        <p role="alert" className="pl-6 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
