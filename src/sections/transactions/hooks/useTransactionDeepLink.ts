import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { TransactionRole } from '../types'
import type { TransactionsListStatus } from './useTransactions'

const HIGHLIGHT_MS = 2600

type Params = {
  role: TransactionRole
  setRole: (role: TransactionRole) => void
  status: TransactionsListStatus
}

/**
 * Deep-link support for notifications: a notification's `navigationUrl` may point
 * at `/transactions?transaction=<id>&role=<buyer|seller>`. This switches to the
 * named role tab (when given) and then, once that list is ready, scrolls to and
 * highlights the matching transaction card — the same effect the public catalog
 * uses for `?product=`. Best-effort: a target that isn't in the loaded page (e.g.
 * paginated out) is silently ignored.
 *
 * Callers register each card's element via `registerCard` and apply the
 * `transaction-highlight` class while its id equals `highlightedId`.
 */
export function useTransactionDeepLink({ role, setRole, status }: Params) {
  const [searchParams, setSearchParams] = useSearchParams()
  const targetId = searchParams.get('transaction')
  const roleParam = searchParams.get('role')
  const targetRole: TransactionRole | null =
    roleParam === 'buyer' || roleParam === 'seller' ? roleParam : null

  const cardRefs = useRef(new Map<string, HTMLElement>())
  const handledId = useRef<string | null>(null)
  const roleSwitched = useRef(false)
  // Cleared only on unmount so dropping the URL param (which re-runs the effect)
  // never cancels an in-flight highlight.
  const highlightTimeout = useRef<number | undefined>(undefined)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const registerCard = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el)
    else cardRefs.current.delete(id)
  }, [])

  // Switch to the notification's role tab once, before we try to locate the card.
  useEffect(() => {
    if (!targetId || !targetRole || roleSwitched.current) return
    roleSwitched.current = true
    if (role !== targetRole) setRole(targetRole)
  }, [targetId, targetRole, role, setRole])

  useEffect(() => {
    if (!targetId || status !== 'ready') return
    if (handledId.current === targetId) return
    // If the notification named a role, wait until that tab is active and loaded.
    if (targetRole && role !== targetRole) return

    // Act on a given target once; re-renders and the param drop below must not
    // re-trigger it.
    handledId.current = targetId
    const card = cardRefs.current.get(targetId)

    // Drop the params so a manual reload doesn't re-fire the highlight.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('transaction')
        next.delete('role')
        return next
      },
      { replace: true },
    )

    // Target isn't in the loaded page (paginated out or wrong role) — nothing to
    // highlight, but the tab switch above still landed the user in the right list.
    if (!card) return

    // Wait a frame so the list has painted before scrolling.
    requestAnimationFrame(() => card.scrollIntoView({ block: 'center', behavior: 'smooth' }))
    setHighlightedId(targetId)
    highlightTimeout.current = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS)
  }, [targetId, targetRole, role, status, setSearchParams])

  useEffect(() => () => window.clearTimeout(highlightTimeout.current), [])

  return { highlightedId, registerCard }
}
