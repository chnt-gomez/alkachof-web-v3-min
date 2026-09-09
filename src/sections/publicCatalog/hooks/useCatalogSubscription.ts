import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchUserSubscriptions, type Subscription } from '../actions/fetchUserSubscriptions'
import { subscribe } from '../actions/subscribe'
import { unsubscribe } from '../actions/unsubscribe'

type CatalogSubscription = {
  /** Whether the current user already follows this catalog. */
  isSubscribed: boolean
  /** Initial status lookup is in flight. */
  isLoading: boolean
  /** A subscribe/unsubscribe mutation is in flight. */
  isPending: boolean
  /** Toggles the subscription; resolves once persisted, rejects on failure. */
  toggle: () => Promise<void>
}

/**
 * The viewer's subscription rows, cached.
 *
 * `GET /subscription/user` returns the whole list, and this screen used to pull
 * all of it on every public catalog visit to answer one boolean. Cached it is
 * read once per session — and it is owner-owned (only this client subscribes or
 * unsubscribes), so the mutations write the result in rather than refetching.
 *
 * It is also what bounds persistence: `queryPersist` keeps a shop's payload on
 * disk only while this list says the viewer is subscribed to it.
 */
export function useSubscriptions(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.subscriptions(),
    queryFn: fetchUserSubscriptions,
    enabled,
  })
}

/**
 * Owns the subscribe/unsubscribe state for a single catalog. `toggle` calls
 * subscribe/unsubscribe and rethrows on failure so the caller can surface a
 * toast. State only flips after the mutation resolves, so a failed call leaves
 * the button unchanged.
 */
export function useCatalogSubscription(
  catalogId: string | undefined,
  enabled: boolean,
): CatalogSubscription {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const { data, isLoading, isError } = useSubscriptions(enabled && Boolean(catalogId))

  // A failed status lookup shouldn't disable the button — read as
  // not-subscribed and let the toggle attempt surface any real error.
  const subscriptions = isError ? [] : (data ?? [])
  const isSubscribed = Boolean(catalogId) && subscriptions.some((s) => s.catalogId === catalogId)

  const toggle = useCallback(async () => {
    if (!catalogId || isPending) return
    setIsPending(true)
    try {
      if (isSubscribed) {
        await unsubscribe(catalogId)
        queryClient.setQueryData<Subscription[]>(queryKeys.subscriptions(), (prev) =>
          (prev ?? []).filter((s) => s.catalogId !== catalogId),
        )
      } else {
        const created = await subscribe(catalogId)
        queryClient.setQueryData<Subscription[]>(queryKeys.subscriptions(), (prev) => [
          ...(prev ?? []),
          created,
        ])
      }
    } finally {
      setIsPending(false)
    }
  }, [catalogId, isSubscribed, isPending, queryClient])

  return { isSubscribed, isLoading: enabled && isLoading, isPending, toggle }
}
