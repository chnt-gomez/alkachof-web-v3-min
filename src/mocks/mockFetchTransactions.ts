import type {
  FetchTransactionsParams,
  TransactionListResult,
} from '@/sections/transactions/actions/fetchTransactions'
import { getTransactionRecords } from './mockTransactionStore'

export function mockFetchTransactions(
  params: FetchTransactionsParams,
): Promise<TransactionListResult> {
  const limit = params.limit ?? 20
  const skip = params.skip ?? 0

  const matching = getTransactionRecords()
    .filter((r) => r.role === params.role)
    .filter((r) => (params.status ? r.summary.status === params.status : true))
    .map((r) => r.summary)
    .sort((a, b) => b.dateCreated.localeCompare(a.dateCreated))

  return Promise.resolve({
    transactions: matching.slice(skip, skip + limit),
    total: matching.length,
    limit,
    skip,
  })
}
