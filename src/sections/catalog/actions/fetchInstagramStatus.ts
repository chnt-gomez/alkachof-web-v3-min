import { api } from '@/lib/api'

/**
 * Falls back to the API's own value if the field is ever missing.
 *
 * Exported because three callers need a number to show before the first read
 * lands — the availability hook, the import wizard and the status cache — and
 * three copies of `7` is three places for the policy to drift.
 */
export const DEFAULT_COOLDOWN_DAYS = 7

/**
 * Whether this seller has linked an Instagram account, and whether they may
 * import right now.
 *
 * Still nothing about *which* account, deliberately. `ig_details` is not public
 * — the API never returns the linked handle or profile id, so the UI branches on
 * enrollment *state* and has no way to display "conectado como @x". The
 * availability fields are safe on that test: they describe a wait, not an
 * identity.
 */
export type InstagramStatus = {
  enrolled: boolean
  /** False while a cooldown is running. Computed server-side — never off the client clock. */
  available: boolean
  /** ISO 8601, or null when nothing is holding the seller. */
  nextAvailable: string | null
  /** The policy, served by the API so this copy cannot drift from the gate. */
  cooldownDays: number
}

/**
 * The one unmetered Instagram endpoint, and the reason a seller in cooldown
 * never reaches a billed one: the catalog screen calls this before it offers the
 * import at all. The gate is still enforced on the API's metered routes — this
 * read is the courtesy, not the control.
 */
export async function fetchInstagramStatus(): Promise<InstagramStatus> {
  const data = await api<Partial<InstagramStatus> & { message: string }>('/instagram/status')
  return {
    enrolled: Boolean(data.enrolled),
    // Absent means "not gated" — an older API predating the cooldown, not a
    // seller to lock out of the feature.
    available: data.available !== false,
    nextAvailable: data.nextAvailable ?? null,
    cooldownDays: data.cooldownDays ?? DEFAULT_COOLDOWN_DAYS,
  }
}
