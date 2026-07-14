import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchTransactions } from '@/mocks'
import type { TransactionRole, TransactionStatus, TransactionSummary } from '../types'

export type FetchTransactionsParams = {
  role: TransactionRole
  status?: TransactionStatus
  limit?: number
  skip?: number
}

export type TransactionListResult = {
  transactions: TransactionSummary[]
  total: number
  limit: number
  skip: number
}

export async function fetchTransactions(
  params: FetchTransactionsParams,
): Promise<TransactionListResult> {
  if (IS_DEV_STAGE) return mockFetchTransactions(params)

  const search = new URLSearchParams({ role: params.role })
  if (params.status) search.set('status', params.status)
  search.set('limit', String(params.limit ?? 20))
  search.set('skip', String(params.skip ?? 0))

  return api<TransactionListResult>(`/transaction/all?${search.toString()}`)
}
