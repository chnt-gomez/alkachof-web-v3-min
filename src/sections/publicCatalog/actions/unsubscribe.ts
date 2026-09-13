import { api } from '@/lib/api'

export async function unsubscribe(catalogId: string): Promise<void> {
  await api<{ message: string }>('/subscription/unsubscribe', {
    method: 'POST',
    body: { catalogId },
  })
}
