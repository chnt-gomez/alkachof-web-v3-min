import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { TransactionRole } from '../types'
import type { TransactionsListStatus } from './useTransactions'

const HIGHLIGHT_MS = 2600

type Params = {
  role: TransactionRole
  setRole: (role: TransactionRole) => void
  status: TransactionsListStatus
  /** The rows currently on screen — the signal that a new list has landed. */
  rows: { id: string }[]
}

/**
 * Deep-link support for notifications: a notification's `navigationUrl` points at
 * `/transactions?highlight=<id>&role=<buyer|seller>` — the shape the API composes
 * in `navigationUrlService.js`, for both product orders and service requests (they
 * share this page). This switches to the named role tab, then, once that list is
 * ready, scrolls to and highlights the matching card — the same effect the public
 * catalog uses for `?product=`. Best-effort: a target that isn't in the loaded page
 * (e.g. paginated out) is silently ignored.
 *
 * `role` is optional because notifications stored before the API started sending it
 * have none. Without it the target may sit in the tab that isn't open — whose rows
 * are never fetched while it's closed — so a miss on the active tab flips to the
 * other one once and looks again when its rows arrive.
 *
 * Callers register each card's element via `registerCard` and apply the
 * `transaction-highlight` class while its id equals `highlightedId`.
 */
export function useTransactionDeepLink({ role, setRole, status, rows }: Params) {
  const [searchParams, setSearchParams] = useSearchParams()
  const targetId = searchParams.get('highlight')
  const roleParam = searchParams.get('role')
  const targetRole: TransactionRole | null =
    roleParam === 'buyer' || roleParam === 'seller' ? roleParam : null

  const cardRefs = useRef(new Map<string, HTMLElement>())
  const handledId = useRef<string | null>(null)
  const roleSwitched = useRef(false)
  // The rows on screen when we switched tabs, or null if we never did. Switching
  // does not swap the list in the same commit — the new tab's fetch starts an
  // effect later — so for a moment a 'ready' feed still holds the rows of the tab
  // we left, and a miss against them proves nothing. Waiting for a different set
  // of ids is what makes the second look meaningful, and bounds it to one retry.
  // (If the new tab loads empty too, the params just stay in the URL: there is
  // nothing to highlight either way, and re-running this on them is a no-op.)
  const rowsAtSwitch = useRef<string | null>(null)
  // Cleared only on unmount so dropping the URL param (which re-runs the effect)
  // never cancels an in-flight highlight.
  const highlightTimeout = useRef<number | undefined>(undefined)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  /** Identity of the list itself, so a re-render with the same rows is a no-op. */
  const rowsKey = rows.map((r) => r.id).join(',')

  const registerCard = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el)
    else cardRefs.current.delete(id)
  }, [])

  // Switch to the notification's role tab once, before we try to locate the card.
  useEffect(() => {
    if (!targetId || !targetRole || roleSwitched.current) return
    roleSwitched.current = true
    if (role !== targetRole) {
      rowsAtSwitch.current = rowsKey
      setRole(targetRole)
    }
  }, [targetId, targetRole, role, rowsKey, setRole])

  useEffect(() => {
    if (!targetId || status !== 'ready') return
    if (handledId.current === targetId) return
    // If the notification named a role, wait until that tab is active and loaded.
    if (targetRole && role !== targetRole) return

    const card = cardRefs.current.get(targetId)

    if (!card) {
      // No role in the link: the row may belong to the other tab. Flip once.
      if (!targetRole && rowsAtSwitch.current === null) {
        rowsAtSwitch.current = rowsKey
        setRole(role === 'seller' ? 'buyer' : 'seller')
        return
      }
      // Switched tabs, but still looking at the rows we left behind.
      if (rowsAtSwitch.current === rowsKey) return
    }

    // Act on a given target once; re-renders and the param drop below must not
    // re-trigger it.
    handledId.current = targetId

    // Drop the params so a manual reload doesn't re-fire the highlight.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('highlight')
        next.delete('role')
        return next
      },
      { replace: true },
    )

    // Target isn't in either loaded list (paginated out, or belongs to neither
    // role) — nothing to highlight, but the user still landed on their orders.
    if (!card) return

    // Wait a frame so the list has painted before scrolling.
    requestAnimationFrame(() => card.scrollIntoView({ block: 'center', behavior: 'smooth' }))
    setHighlightedId(targetId)
    highlightTimeout.current = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS)
  }, [targetId, targetRole, role, status, rowsKey, setRole, setSearchParams])

  useEffect(() => () => window.clearTimeout(highlightTimeout.current), [])

  return { highlightedId, registerCard }
}
