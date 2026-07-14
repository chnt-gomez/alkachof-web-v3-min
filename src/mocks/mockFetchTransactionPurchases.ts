import type { PurchaseLine } from '@/sections/transactions/types'
import { getTransactionRecordById } from './mockTransactionStore'

export function mockFetchTransactionPurchases(transactionId: string): Promise<PurchaseLine[]> {
  const record = getTransactionRecordById(transactionId)
  return Promise.resolve(record?.purchases ?? [])
}
