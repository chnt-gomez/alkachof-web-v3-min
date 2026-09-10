import { api } from '@/lib/api'
import type { Transaction, TransactionStatus } from '../types'

/**
 * Move a transaction to a new status. Member-gated on the backend; the service
 * enforces which role may perform which transition and returns HTTP 500 with
 * "Invalid status transition" when the move is not allowed.
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
): Promise<Transaction> {
  const data = await api<{ message: string; transaction: Transaction }>(
    `/transaction/${transactionId}/status`,
    { method: 'POST', body: { status } },
  )
  return data.transaction
}
