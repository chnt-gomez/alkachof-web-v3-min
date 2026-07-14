import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchTransactionPurchases } from '@/mocks'
import type { PurchaseLine } from '../types'

export async function fetchTransactionPurchases(
  transactionId: string,
): Promise<PurchaseLine[]> {
  if (IS_DEV_STAGE) return mockFetchTransactionPurchases(transactionId)
  const data = await api<{ purchases: PurchaseLine[] }>(
    `/transaction/${transactionId}/purchases`,
  )
  return data.purchases
}
