import { api } from '@/lib/api'
import type { PurchaseLine } from '../types'

export async function fetchTransactionPurchases(
  transactionId: string,
): Promise<PurchaseLine[]> {
  const data = await api<{ purchases: PurchaseLine[] }>(
    `/transaction/${transactionId}/purchases`,
  )
  return data.purchases
}
