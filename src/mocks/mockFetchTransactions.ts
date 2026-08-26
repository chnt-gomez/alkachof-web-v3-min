import type {
  FetchTransactionsParams,
  TransactionListResult,
} from '@/sections/transactions/actions/fetchTransactions'
import { getTransactionRecords } from './mockTransactionStore'
import { isArchivedOrder, TERMINAL_TRANSACTION_STATUSES } from './ordersArchive'

export function mockFetchTransactions(
  params: FetchTransactionsParams,
): Promise<TransactionListResult> {
  const limit = params.limit ?? 20
  const skip = params.skip ?? 0

  const matching = getTransactionRecords()
    .filter((r) => r.role === params.role)
    .filter((r) => (params.status ? r.summary.status === params.status : true))
    .map((r) => r.summary)
    // The active feed hides finished and long-untouched orders; the history
    // shows everything, exactly as the API does.
    .filter((summary) =>
      params.scope === 'history'
        ? true
        : !isArchivedOrder(summary, TERMINAL_TRANSACTION_STATUSES),
    )
    .sort((a, b) => b.dateCreated.localeCompare(a.dateCreated))

  return Promise.resolve({
    transactions: matching.slice(skip, skip + limit),
    total: matching.length,
    limit,
    skip,
  })
}
