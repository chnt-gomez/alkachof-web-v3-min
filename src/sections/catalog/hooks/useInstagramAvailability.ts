import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DEFAULT_COOLDOWN_DAYS } from '../actions/fetchInstagramStatus'
import { instagramStatusQueryOptions } from './useInstagramStatus'

export type InstagramAvailability = {
  /** False while a cooldown is running. Optimistic `true` until the read lands. */
  available: boolean
  /** ISO 8601, or null when nothing is holding the seller. */
  nextAvailable: string | null
  cooldownDays: number
  refresh: () => void
}

/**
 * Whether the catalog screen should offer "Importar de Instagram" at all.
 *
 * `/instagram/status` is the only unmetered endpoint in the section — one mongo
 * read, no scraper — so asking it up front costs nothing and saves the seller a
 * dialog that could only tell them no. **This is the courtesy, not the control:**
 * the gate is enforced on the API's metered routes, and a stale `available: true`
 * here just means the seller meets the same refusal one screen later.
 *
 * It reads the shared cache entry rather than fetching for itself, so the grid
 * and the import dialog cost one request between them instead of one each, and
 * a cooldown the dialog just learned about lands on this button with no round
 * trip at all (see `useInstagramStatusCache`).
 *
 * It fails open, and now structurally: an errored or still-loading query has no
 * data, and no data reads as available. A status read that fails must not remove
 * a working feature — the API is still the thing that decides, and it will
 * refuse if it must.
 */
export function useInstagramAvailability(): InstagramAvailability {
  const { data, refetch } = useQuery(instagramStatusQueryOptions())

  const refresh = useCallback(() => {
    void refetch()
  }, [refetch])

  return {
    // An un-enrolled seller has nothing to wait for — the wizard is what they
    // get, and it is gated by enrollment being permanent instead.
    available: !data || !data.enrolled || data.available,
    nextAvailable: data?.nextAvailable ?? null,
    cooldownDays: data?.cooldownDays ?? DEFAULT_COOLDOWN_DAYS,
    refresh,
  }
}
