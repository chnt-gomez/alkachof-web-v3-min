import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchItem } from '@/sections/catalog/actions/fetchItem'
// Batch alias lookup, owned by the transactions section (which resolves buyer
// names on its own rows the same way). Shared rather than duplicated.
import { fetchProfileSummaries } from '@/sections/transactions/actions/fetchProfileSummaries'
import type { OrdersScope } from '@/sections/transactions/types'
import { fetchRequests } from '../actions/fetchRequests'
import type {
  RequestRole,
  RequestStatus,
  ServiceRequest,
  ServiceRequestRow,
} from '../types'

const PAGE_SIZE = 20
const SERVICE_FALLBACK = 'Servicio'

/**
 * Appends a page, skipping rows already held — same guard as `useTransactions`.
 * Skip-based paging over a moving dataset can hand back a row twice (a booking
 * that un-archives between two calls shifts every later row down a slot), which
 * would render the same request twice under a duplicate React key.
 */
function appendNew(existing: ServiceRequest[], incoming: ServiceRequest[]): ServiceRequest[] {
  const held = new Set(existing.map((row) => row.id))
  return [...existing, ...incoming.filter((row) => !held.has(row.id))]
}
/** Shown when the other party's alias can't be resolved (deleted or alias-less profile). */
const COUNTERPARTY_FALLBACK: Record<RequestRole, string> = {
  buyer: 'un vendedor',
  seller: 'un comprador',
}

export type RequestsListStatus = 'loading' | 'ready' | 'error'

/**
 * Owns the requests list: role, status filter, scope, skip-based pagination, and
 * the two enrichments the contract does not provide — the service's name and
 * the other party's alias.
 *
 * `/request/all` used to return every request in one go; it is now paginated and
 * filtered exactly like `/transaction/all`, so this hook accumulates pages
 * behind a "load more" the same way `useTransactions` does. Changing role,
 * filter or scope resets the list and refetches from the first page.
 *
 * `enabled` lets the caller skip fetching when the active filter excludes
 * requests altogether.
 */
export function useRequests({
  role,
  statusFilter,
  scope = 'active',
  enabled = true,
}: {
  role: RequestRole
  /** Server-side status filter; `null` means all. */
  statusFilter: RequestStatus | null
  /** Which slice of the feed to read; `history` includes archived rows. */
  scope?: OrdersScope
  /** When false the list stays empty and no request is made. */
  enabled?: boolean
}) {
  const [status, setStatus] = useState<RequestsListStatus>('loading')
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  // Service display data, keyed by serviceId. Accumulated across loads; a miss
  // just falls back to a generic label rather than blocking the list.
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({})
  // Counterparty display names, keyed by userId. Same best-effort contract as
  // the service names: a miss falls back to a generic label.
  const [aliases, setAliases] = useState<Record<string, string>>({})
  const inFlight = useRef(new Set<string>())
  // Bumped on every load. A response whose ticket is no longer the current one
  // belongs to a role/filter the user has already left — a notification deep-link
  // switches tabs one commit after mount, so the first tab's answer routinely
  // arrives late — and writing it would blank the list they are looking at.
  const loadTicket = useRef(0)

  const resolveServices = useCallback(async (rows: ServiceRequest[]) => {
    const ids = Array.from(new Set(rows.map((r) => r.serviceId))).filter(
      (id) => !inFlight.current.has(id),
    )
    if (ids.length === 0) return
    ids.forEach((id) => inFlight.current.add(id))

    // N+1 against GET /item/{id} — the list endpoint does not carry the service
    // name yet (asked for in blueprint §7). Best-effort and per-id so one
    // failure doesn't blank the rest.
    await Promise.all(
      ids.map(async (id) => {
        try {
          const item = await fetchItem(id)
          setServiceNames((prev) => ({ ...prev, [id]: item.name || SERVICE_FALLBACK }))
        } catch {
          setServiceNames((prev) => ({ ...prev, [id]: SERVICE_FALLBACK }))
        }
      }),
    )
  }, [])

  /**
   * Resolves the person on the other side of each row through the batch alias
   * endpoint — the seller on Compras, the buyer on Ventas. Naming the current
   * user would tell them nothing.
   */
  const resolveAliases = useCallback(
    async (rows: ServiceRequest[]) => {
      const ids = Array.from(
        new Set(rows.map((r) => (role === 'buyer' ? r.sellerId : r.buyerId)).filter(Boolean)),
      )
      if (ids.length === 0) return
      try {
        const summaries = await fetchProfileSummaries(ids)
        setAliases((prev) => {
          const next = { ...prev }
          // The endpoint omits ids it can't resolve, so fill every asked-for id
          // here rather than leaving the row waiting on a name that never comes.
          for (const id of ids) next[id] = summaries[id]?.alias || COUNTERPARTY_FALLBACK[role]
          return next
        })
      } catch {
        // Best-effort: unresolved rows keep the generic label.
      }
    },
    [role],
  )

  const loadPage = useCallback(
    (skip: number) =>
      fetchRequests({
        role,
        status: statusFilter ?? undefined,
        scope,
        limit: PAGE_SIZE,
        skip,
      }),
    [role, statusFilter, scope],
  )

  const reload = useCallback(async () => {
    const ticket = ++loadTicket.current
    setAliases({})
    // The active filter can exclude requests entirely (e.g. "En camino" is a
    // product-only status), in which case there is nothing to ask for.
    if (!enabled) {
      setRequests([])
      setTotal(0)
      setStatus('ready')
      return
    }
    setStatus('loading')
    try {
      const result = await loadPage(0)
      if (ticket !== loadTicket.current) return
      setRequests(result.requests)
      setTotal(result.total)
      setStatus('ready')
      void resolveServices(result.requests)
      void resolveAliases(result.requests)
    } catch {
      if (ticket !== loadTicket.current) return
      setStatus('error')
    }
  }, [enabled, loadPage, resolveServices, resolveAliases])

  useEffect(() => {
    reload()
  }, [reload])

  const loadMore = useCallback(async () => {
    const ticket = loadTicket.current
    setLoadingMore(true)
    try {
      const result = await loadPage(requests.length)
      // The tab, filter or scope changed while the page was in flight:
      // appending it now would mix two lists.
      if (ticket !== loadTicket.current) return
      setRequests((prev) => appendNew(prev, result.requests))
      setTotal(result.total)
      void resolveServices(result.requests)
      void resolveAliases(result.requests)
    } catch {
      // Keep the pages we already have; the user can tap "load more" again.
    } finally {
      setLoadingMore(false)
    }
  }, [loadPage, requests.length, resolveServices, resolveAliases])

  /** Applies a status/price change in place so the list reflects it instantly. */
  const patchRequest = useCallback((updated: ServiceRequest) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }, [])

  const rows: ServiceRequestRow[] = requests.map((request) => ({
    ...request,
    serviceName: serviceNames[request.serviceId] ?? SERVICE_FALLBACK,
    serviceImgPath: '',
    counterpartyAlias:
      aliases[role === 'buyer' ? request.sellerId : request.buyerId] ??
      COUNTERPARTY_FALLBACK[role],
  }))

  return {
    status,
    rows,
    total,
    hasMore: requests.length < total,
    loadingMore,
    loadMore,
    reload,
    patchRequest,
  }
}
