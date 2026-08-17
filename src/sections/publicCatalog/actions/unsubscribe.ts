import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUnsubscribe } from '@/mocks'

export async function unsubscribe(catalogId: string): Promise<void> {
  if (IS_DEV_STAGE) return mockUnsubscribe(catalogId)
  await api<{ message: string }>('/subscription/unsubscribe', {
    method: 'POST',
    body: { catalogId },
  })
}
