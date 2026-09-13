import { useCallback, useMemo, useState } from 'react'
import { useRequests } from '@/sections/requests/hooks/useRequests'
import type { ServiceRequest, ServiceRequestRow } from '@/sections/requests/types'
import { filterByLabel } from '../components/orderStatusFilter'
import { useTransactions } from './useTransactions'
import type {
  OrdersScope,
  TransactionRole,
  TransactionStatus,
  TransactionSummary,
} from '../types'

/**
 * One row of the Pedidos feed. Product orders and service requests sit in the
 * same list — the role tabs are the only split — so rows are a tagged union and
 * each kind keeps its own card and detail dialog.
 */
export type OrderRow =
  | { kind: 'transaction'; id: string; dateCreated: string; transaction: TransactionSummary }
  | { kind: 'request'; id: string; dateCreated: string; request: ServiceRequestRow }

export type OrdersFeedStatus = 'loading' | 'ready' | 'error'

/**
 * The Pedidos feed: buyer or seller, both entities merged, newest first.
 *
 * **Both halves now paginate.** They are still two independent server-side
 * lists with their own totals, so "Cargar más" asks each half that still has
 * rows for its next page and the merge re-sorts the accumulated result. A
 * consequence worth knowing: an older row arriving on page 2 inserts *below*
 * rows already on screen rather than appending to the bottom. That is correct by
 * date, and paging the merged set is not possible without a combined endpoint.
 *
 * `scope` switches the whole feed between the active list and the full history.
 * The API filters finished and long-untouched orders out of the active one, so
 * the history is the only way to reach them — both halves must switch together,
 * or the screen would show active products beside archived services.
 */
export function useOrdersFeed() {
  // Opens on Ventas — the left tab, matching Home opening on its left tab. A
  // `?role=` deep link still wins (see useTransactionDeepLink).
  const [role, setRole] = useState<TransactionRole>('seller')
  /** Chips filter by status *label*, since the two enums are disjoint. */
  const [statusLabel, setStatusLabel] = useState<string | null>(null)
  const [scope, setScope] = useState<OrdersScope>('active')

  const active = filterByLabel(statusLabel)
  // A label that belongs to only one entity switches the other off entirely,
  // rather than fetching rows that would all be filtered away.
  const wantsTransactions = !active || active.transaction !== undefined
  const wantsRequests = !active || active.request !== undefined

  const transactionsFeed = useTransactions({
    role,
    statusFilter: active?.transaction ?? null,
    scope,
    enabled: wantsTransactions,
  })
  const requestsFeed = useRequests({
    role,
    statusFilter: active?.request ?? null,
    scope,
    enabled: wantsRequests,
  })

  const rows = useMemo<OrderRow[]>(() => {
    const merged: OrderRow[] = [
      ...transactionsFeed.transactions.map(
        (transaction): OrderRow => ({
          kind: 'transaction',
          id: transaction.id,
          dateCreated: transaction.dateCreated,
          transaction,
        }),
      ),
      ...requestsFeed.rows.map(
        (request): OrderRow => ({
          kind: 'request',
          id: request.id,
          dateCreated: request.dateCreated,
          request,
        }),
      ),
    ]
    return merged.sort(
      (a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime(),
    )
  }, [transactionsFeed.transactions, requestsFeed.rows])

  // Only the halves the filter actually asked for count toward the verdict.
  const sources = [
    wantsTransactions ? transactionsFeed.status : null,
    wantsRequests ? requestsFeed.status : null,
  ].filter((s): s is OrdersFeedStatus => s !== null)

  // Loading while any asked-for half is still working; errored only when *every*
  // one failed, so a single dead endpoint never blanks the whole screen.
  const status: OrdersFeedStatus = sources.includes('loading')
    ? 'loading'
    : sources.every((s) => s === 'error')
      ? 'error'
      : 'ready'

  /**
   * One half failed while the other returned. The list is shown but incomplete,
   * which the user has no way of knowing otherwise — so the page says so
   * instead of quietly presenting a partial feed as the whole truth.
   */
  const partialError = status === 'ready' && sources.includes('error')

  const reload = useCallback(() => {
    void transactionsFeed.reload()
    void requestsFeed.reload()
  }, [transactionsFeed, requestsFeed])

  const patchTransaction = useCallback(
    (id: string, next: TransactionStatus) => transactionsFeed.patchTransaction(id, next),
    [transactionsFeed],
  )

  const patchRequest = useCallback(
    (updated: ServiceRequest) => requestsFeed.patchRequest(updated),
    [requestsFeed],
  )

  // Each half owns its own paging, so "load more" asks only the halves that
  // actually have another page — asking an exhausted one would refetch its last
  // page and duplicate rows.
  const transactionsHaveMore = wantsTransactions && transactionsFeed.hasMore
  const requestsHaveMore = wantsRequests && requestsFeed.hasMore

  const loadMore = useCallback(async () => {
    await Promise.all([
      transactionsHaveMore ? transactionsFeed.loadMore() : Promise.resolve(),
      requestsHaveMore ? requestsFeed.loadMore() : Promise.resolve(),
    ])
  }, [transactionsHaveMore, requestsHaveMore, transactionsFeed, requestsFeed])

  return {
    role,
    setRole,
    statusLabel,
    setStatusLabel,
    scope,
    setScope,
    status,
    partialError,
    rows,
    // Rows are left to see if *either* half has another page.
    hasMore: transactionsHaveMore || requestsHaveMore,
    loadingMore: transactionsFeed.loadingMore || requestsFeed.loadingMore,
    loadMore,
    reload,
    patchTransaction,
    patchRequest,
    headerFor: transactionsFeed.headerFor,
  }
}
