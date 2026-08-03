import type { Transaction, TransactionStatus } from '@/sections/transactions/types'
import { setTransactionRecordStatus } from './mockTransactionStore'

const MOCK_USER_ID = 'mock-user'

export function mockUpdateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
): Promise<Transaction> {
  const record = setTransactionRecordStatus(transactionId, status)
  if (!record) {
    return Promise.reject(new Error('Transaction not found'))
  }

  const { summary, role } = record
  const isSeller = role === 'seller'
  return Promise.resolve({
    id: summary.id,
    purchaseIds: summary.purchaseIds,
    buyerId: isSeller ? summary.counterpartyId : MOCK_USER_ID,
    sellerId: isSeller ? MOCK_USER_ID : summary.counterpartyId,
    status: summary.status,
    dateCreated: summary.dateCreated,
    dateUpdated: summary.dateUpdated,
  })
}
