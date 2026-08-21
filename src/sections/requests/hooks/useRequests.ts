import { useCallback, useEffect, useRef, useState } from 'react'
import { IS_DEV_STAGE } from '@/lib/stage'
import { serviceNameFor } from '@/mocks'
import { fetchItem } from '@/sections/catalog/actions/fetchItem'
// Batch alias lookup, owned by the transactions section (which resolves buyer
// names on its own rows the same way). Shared rather than duplicated.
import { fetchProfileSummaries } from '@/sections/transactions/actions/fetchProfileSummaries'
import { fetchRequests } from '../actions/fetchRequests'
import type {
  RequestRole,
  RequestStatus,
  ServiceRequest,
  ServiceRequestRow,
} from '../types'

const SERVICE_FALLBACK = 'Servicio'
/** Shown when the other party's alias can't be resolved (deleted or alias-less profile). */
const COUNTERPARTY_FALLBACK: Record<RequestRole, string> = {
  buyer: 'un vendedor',
  seller: 'un comprador',
}

export type RequestsListStatus = 'loading' | 'ready' | 'error'

/**
 * Owns the requests list: role, status filter, and the two enrichments the
 * draft contract does not provide — the service's name and the other party's
 * alias.
 *
 * Deliberately not shared with `useTransactions`: `/request/all` is unpaginated
 * by design, so there is no skip/accumulate logic here, which is most of what
 * that hook does.
 *
 * `enabled` lets the caller skip fetching when the active filter excludes
 * requests altogether.
 */
export function useRequests({
  role,
  statusFilter,
  enabled = true,
}: {
  role: RequestRole
  /** Server-side status filter; `null` means all. */
  statusFilter: RequestStatus | null
  /** When false the list stays empty and no request is made. */
  enabled?: boolean
}) {
  const [status, setStatus] = useState<RequestsListStatus>('loading')
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  // Service display data, keyed by serviceId. Accumulated across loads; a miss
  // just falls back to a generic label rather than blocking the list.
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({})
  // Counterparty display names, keyed by userId. Same best-effort contract as
  // the service names: a miss falls back to a generic label.
  const [aliases, setAliases] = useState<Record<string, string>>({})
  const inFlight = useRef(new Set<string>())

  const resolveServices = useCallback(async (rows: ServiceRequest[]) => {
    const ids = Array.from(new Set(rows.map((r) => r.serviceId))).filter(
      (id) => !inFlight.current.has(id),
    )
    if (ids.length === 0) return
    ids.forEach((id) => inFlight.current.add(id))

    // While requests are mocked, names come from the seeded store — the mocked
    // items endpoint would invent an unrelated name for these ids.
    if (IS_DEV_STAGE) {
      setServiceNames((prev) => {
        const next = { ...prev }
        for (const id of ids) next[id] = serviceNameFor(id) ?? SERVICE_FALLBACK
        return next
      })
      return
    }

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

  const reload = useCallback(async () => {
    setAliases({})
    // The active filter can exclude requests entirely (e.g. "En camino" is a
    // product-only status), in which case there is nothing to ask for.
    if (!enabled) {
      setRequests([])
      setStatus('ready')
      return
    }
    setStatus('loading')
    try {
      const result = await fetchRequests({ role, status: statusFilter ?? undefined })
      setRequests(result)
      setStatus('ready')
      void resolveServices(result)
      void resolveAliases(result)
    } catch {
      setStatus('error')
    }
  }, [enabled, role, statusFilter, resolveServices, resolveAliases])

  useEffect(() => {
    reload()
  }, [reload])

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
    reload,
    patchRequest,
  }
}
