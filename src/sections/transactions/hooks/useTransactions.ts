import { useCallback, useEffect, useState } from 'react'
import { fetchTransactions } from '../actions/fetchTransactions'
import type { TransactionRole, TransactionStatus, TransactionSummary } from '../types'

const PAGE_SIZE = 20

export type TransactionsListStatus = 'loading' | 'ready' | 'error'

/**
 * Owns the transactions list state: role tab, status filter, and skip-based
 * pagination that accumulates pages behind a "load more" action. Changing the
 * role or filter resets the list and refetches from the first page.
 */
export function useTransactions() {
  const [role, setRole] = useState<TransactionRole>('buyer')
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | null>(null)
  const [status, setStatus] = useState<TransactionsListStatus>('loading')
  const [transactions, setTransactions] = useState<TransactionSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadPage = useCallback(
    (skip: number) =>
      fetchTransactions({
        role,
        status: statusFilter ?? undefined,
        limit: PAGE_SIZE,
        skip,
      }),
    [role, statusFilter],
  )

  const reload = useCallback(async () => {
    setStatus('loading')
    try {
      const result = await loadPage(0)
      setTransactions(result.transactions)
      setTotal(result.total)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [loadPage])

  useEffect(() => {
    reload()
  }, [reload])

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const result = await loadPage(transactions.length)
      setTransactions((prev) => [...prev, ...result.transactions])
      setTotal(result.total)
    } catch {
      // Keep the pages we already have; the user can tap "load more" again.
    } finally {
      setLoadingMore(false)
    }
  }, [loadPage, transactions.length])

  return {
    role,
    setRole,
    statusFilter,
    setStatusFilter,
    status,
    transactions,
    total,
    hasMore: transactions.length < total,
    loadingMore,
    loadMore,
    reload,
  }
}
