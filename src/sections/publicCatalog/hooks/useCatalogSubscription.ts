import { useCallback, useEffect, useState } from 'react'
import { fetchUserSubscriptions } from '../actions/fetchUserSubscriptions'
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
 * Owns the subscribe/unsubscribe state for a single catalog. The status is
 * resolved from `GET /subscription/user` (only when `enabled`, i.e. the viewer
 * is an authenticated non-owner), and `toggle` calls subscribe/unsubscribe and
 * rethrows on failure so the caller can surface a toast. State only flips after
 * the mutation resolves, so a failed call leaves the button unchanged.
 */
export function useCatalogSubscription(
  catalogId: string | undefined,
  enabled: boolean,
): CatalogSubscription {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!enabled || !catalogId) {
      setIsSubscribed(false)
      return
    }
    let active = true
    setIsLoading(true)
    fetchUserSubscriptions()
      .then((subs) => {
        if (active) setIsSubscribed(subs.some((s) => s.catalogId === catalogId))
      })
      // A failed status lookup shouldn't disable the button — treat as
      // not-subscribed and let the toggle attempt surface any real error.
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [catalogId, enabled])

  const toggle = useCallback(async () => {
    if (!catalogId || isPending) return
    setIsPending(true)
    try {
      if (isSubscribed) {
        await unsubscribe(catalogId)
        setIsSubscribed(false)
      } else {
        await subscribe(catalogId)
        setIsSubscribed(true)
      }
    } finally {
      setIsPending(false)
    }
  }, [catalogId, isSubscribed, isPending])

  return { isSubscribed, isLoading, isPending, toggle }
}
