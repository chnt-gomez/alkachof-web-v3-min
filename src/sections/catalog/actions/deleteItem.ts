import { IS_DEV_STAGE } from '@/lib/stage'
import { mockDeleteItem } from '@/mocks'
import { api } from '@/lib/api'

export async function deleteItem(itemId: string): Promise<void> {
  if (IS_DEV_STAGE) return mockDeleteItem(itemId)
  await api<void>(`/item/${itemId}/delete`, { method: 'POST' })
}
