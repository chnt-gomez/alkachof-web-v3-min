import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchInstagramStatus } from '../actions/fetchInstagramStatus'

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
 * It fails open. A status read that errors must not remove a working feature —
 * the API is still the thing that decides, and it will refuse if it must.
 */
export function useInstagramAvailability(): InstagramAvailability {
  const [state, setState] = useState<Omit<InstagramAvailability, 'refresh'>>({
    available: true,
    nextAvailable: null,
    cooldownDays: 7,
  })

  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const refresh = useCallback(() => {
    void fetchInstagramStatus()
      .then((status) => {
        if (!alive.current) return
        setState({
          // An un-enrolled seller has nothing to wait for — the wizard is what
          // they get, and it is gated by enrollment being permanent instead.
          available: !status.enrolled || status.available,
          nextAvailable: status.nextAvailable,
          cooldownDays: status.cooldownDays,
        })
      })
      // Fail open, deliberately: see above.
      .catch(() => {})
  }, [])

  useEffect(() => refresh(), [refresh])

  return { ...state, refresh }
}
