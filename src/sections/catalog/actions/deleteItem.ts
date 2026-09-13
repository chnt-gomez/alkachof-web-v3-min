import { api } from '@/lib/api'

export async function deleteItem(itemId: string): Promise<void> {
  await api<void>(`/item/${itemId}/delete`, { method: 'POST' })
}
