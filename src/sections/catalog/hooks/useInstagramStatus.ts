import { useMemo } from 'react'
import { queryOptions, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  DEFAULT_COOLDOWN_DAYS,
  fetchInstagramStatus,
  type InstagramStatus,
} from '../actions/fetchInstagramStatus'

/**
 * How long an *ungated* status read stays fresh. Short, because the only thing
 * it can miss is a cooldown started somewhere else; long enough to collapse the
 * burst of reads a single screen used to make — the grid and the dialog asked
 * separately, one after the other.
 */
const UNGATED_STALE_MS = 5 * 60 * 1000

/**
 * The shared read of `/instagram/status`, so the catalog grid and the import
 * dialog land on one cache entry instead of one request each.
 *
 * **Freshness is the cooldown itself.** While the API is holding this seller,
 * `nextAvailable` is a fixed date in the future and there is nothing to learn by
 * asking again — so the entry stays fresh until that moment passes, then goes
 * stale so the next mount re-reads once and finds the gate lifted.
 *
 * This does **not** break the section's rule that the date is never computed
 * locally. The client's clock decides only when to re-read an *unmetered*
 * endpoint; it never decides whether the seller may import. The date on screen
 * is still the server's string, and the gate is still the API's 429 on `/posts`
 * and `/convert`. A skewed clock costs one extra status read, or one refused
 * metered call the UI already treats as terminal.
 */
export function instagramStatusQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.instagramStatus(),
    queryFn: fetchInstagramStatus,
    // This read fails open — a retry buys nothing but a second request.
    retry: 0,
    staleTime: (query) => {
      const next = query.state.data?.nextAvailable
      if (!next) return UNGATED_STALE_MS
      const remaining = Date.parse(next) - Date.now()
      return Number.isFinite(remaining) && remaining > 0 ? remaining : 0
    },
  })
}

/**
 * The write side: everything the server tells us about the gate goes in here,
 * so nothing has to re-read `/status` to find out what it was just told.
 *
 * `ensure` is the read for callers outside a component render — it answers from
 * cache when fresh and fetches when not.
 */
export function useInstagramStatusCache() {
  const queryClient = useQueryClient()

  return useMemo(
    () => ({
      ensure: (): Promise<InstagramStatus> =>
        queryClient.ensureQueryData(instagramStatusQueryOptions()),

      /** Enrollment is permanent, so this only ever moves in one direction. */
      markEnrolled: () =>
        queryClient.setQueryData<InstagramStatus>(queryKeys.instagramStatus(), (prev) => ({
          available: prev?.available ?? true,
          nextAvailable: prev?.nextAvailable ?? null,
          cooldownDays: prev?.cooldownDays ?? DEFAULT_COOLDOWN_DAYS,
          enrolled: true,
        })),

      /**
       * A successful import, or a 429 from either metered route. Written whole
       * rather than merged: an import proves enrollment, and a seller can reach
       * this having never had a successful status read (it fails open), so
       * there may be no previous entry to merge into.
       */
      markCooldown: (nextAvailable: string | null) =>
        queryClient.setQueryData<InstagramStatus>(queryKeys.instagramStatus(), (prev) => ({
          enrolled: true,
          available: false,
          nextAvailable,
          cooldownDays: prev?.cooldownDays ?? DEFAULT_COOLDOWN_DAYS,
        })),
    }),
    [queryClient],
  )
}
