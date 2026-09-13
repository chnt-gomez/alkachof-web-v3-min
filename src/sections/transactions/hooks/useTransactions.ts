import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchTransactions } from '../actions/fetchTransactions'
import { fetchCatalogSummaries } from '../actions/fetchCatalogSummaries'
import { fetchProfileSummaries } from '../actions/fetchProfileSummaries'
import type {
  OrdersScope,
  TransactionRole,
  TransactionStatus,
  TransactionSummary,
} from '../types'

const PAGE_SIZE = 20

/**
 * Appends a page, skipping rows already held.
 *
 * Skip-based paging over a moving dataset can hand back a row twice: archiving
 * is evaluated per request, so a row that un-archives between two calls shifts
 * every later row down a slot and the next page repeats one. Without this, that
 * renders the same order twice under a duplicate React key.
 */
function appendNew<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const held = new Set(existing.map((row) => row.id))
  return [...existing, ...incoming.filter((row) => !held.has(row.id))]
}

/** Generic labels when a row's shop/buyer can't be resolved. */
const CATALOG_FALLBACK = 'Catálogo'
const BUYER_FALLBACK = 'Comprador'

export type TransactionsListStatus = 'loading' | 'ready' | 'error'

/**
 * Owns the transactions list state: role tab, status filter, scope, and
 * skip-based pagination that accumulates pages behind a "load more" action.
 * Changing the role, filter or scope resets the list and refetches from the
 * first page.
 *
 * Each row also gets a human-readable header (`headerFor`): the shop name on the
 * buyer view (resolved from `catalogId`) and the buyer name on the seller view
 * (resolved from `counterpartyId`), both via batch summary endpoints. Names are
 * cached and resolved best-effort — a failed lookup just falls back to a
 * generic label, never blocking the list.
 */
export function useTransactions({
  role,
  statusFilter,
  scope = 'active',
  enabled = true,
}: {
  role: TransactionRole
  /** Server-side status filter; `null` means all. */
  statusFilter: TransactionStatus | null
  /** Which slice of the feed to read; `history` includes archived rows. */
  scope?: OrdersScope
  /** When false the list stays empty and no request is made. */
  enabled?: boolean
}) {
  const [status, setStatus] = useState<TransactionsListStatus>('loading')
  const [transactions, setTransactions] = useState<TransactionSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  // Resolved header names, keyed by the relevant id (catalog on buyer rows,
  // user on seller rows). Accumulated across pages; reset when the role changes.
  const [catalogNames, setCatalogNames] = useState<Record<string, string>>({})
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({})
  // Bumped on every load. A response whose ticket is no longer the current one
  // belongs to a role/filter the user has already left — a notification deep-link
  // switches tabs one commit after mount, so the first tab's answer routinely
  // arrives late — and writing it would blank the list they are looking at.
  const loadTicket = useRef(0)

  const loadPage = useCallback(
    (skip: number) =>
      fetchTransactions({
        role,
        status: statusFilter ?? undefined,
        scope,
        limit: PAGE_SIZE,
        skip,
      }),
    [role, statusFilter, scope],
  )

  const resolveHeaders = useCallback(
    async (rows: TransactionSummary[]) => {
      try {
        if (role === 'buyer') {
          const ids = Array.from(
            new Set(rows.map((r) => r.catalogId).filter((id): id is string => Boolean(id))),
          )
          if (ids.length === 0) return
          const summaries = await fetchCatalogSummaries(ids)
          setCatalogNames((prev) => {
            const next = { ...prev }
            for (const id of ids) next[id] = summaries[id]?.alias || CATALOG_FALLBACK
            return next
          })
        } else {
          const ids = Array.from(
            new Set(rows.map((r) => r.counterpartyId).filter(Boolean)),
          )
          if (ids.length === 0) return
          const summaries = await fetchProfileSummaries(ids)
          setBuyerNames((prev) => {
            const next = { ...prev }
            for (const id of ids) next[id] = summaries[id]?.alias || BUYER_FALLBACK
            return next
          })
        }
      } catch {
        // Best-effort: leave unresolved rows on their generic fallback label.
      }
    },
    [role],
  )

  const reload = useCallback(async () => {
    const ticket = ++loadTicket.current
    setCatalogNames({})
    setBuyerNames({})
    // The active filter can exclude product orders entirely (e.g. "Cotizado" is
    // a request-only status), in which case there is nothing to ask for.
    if (!enabled) {
      setTransactions([])
      setTotal(0)
      setStatus('ready')
      return
    }
    setStatus('loading')
    try {
      const result = await loadPage(0)
      if (ticket !== loadTicket.current) return
      setTransactions(result.transactions)
      setTotal(result.total)
      setStatus('ready')
      void resolveHeaders(result.transactions)
    } catch {
      if (ticket !== loadTicket.current) return
      setStatus('error')
    }
  }, [enabled, loadPage, resolveHeaders])

  useEffect(() => {
    reload()
  }, [reload])

  const patchTransaction = useCallback(
    (id: string, status: TransactionStatus) => {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status, dateUpdated: new Date().toISOString() } : t,
        ),
      )
    },
    [],
  )

  const loadMore = useCallback(async () => {
    const ticket = loadTicket.current
    setLoadingMore(true)
    try {
      const result = await loadPage(transactions.length)
      // The tab or filter changed while the page was in flight: appending it now
      // would mix two lists.
      if (ticket !== loadTicket.current) return
      setTransactions((prev) => appendNew(prev, result.transactions))
      setTotal(result.total)
      void resolveHeaders(result.transactions)
    } catch {
      // Keep the pages we already have; the user can tap "load more" again.
    } finally {
      setLoadingMore(false)
    }
  }, [loadPage, transactions.length, resolveHeaders])

  const headerFor = useCallback(
    (transaction: TransactionSummary): string => {
      if (role === 'buyer') {
        return (transaction.catalogId && catalogNames[transaction.catalogId]) || CATALOG_FALLBACK
      }
      return buyerNames[transaction.counterpartyId] || BUYER_FALLBACK
    },
    [role, catalogNames, buyerNames],
  )

  return {
    status,
    transactions,
    total,
    hasMore: transactions.length < total,
    loadingMore,
    loadMore,
    reload,
    patchTransaction,
    headerFor,
  }
}
