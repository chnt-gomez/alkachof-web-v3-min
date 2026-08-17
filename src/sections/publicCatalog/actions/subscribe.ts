import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockSubscribe } from '@/mocks'
import type { Subscription } from './fetchUserSubscriptions'

export async function subscribe(catalogId: string): Promise<Subscription> {
  if (IS_DEV_STAGE) return mockSubscribe(catalogId)
  const data = await api<{ message: string; subscription: Subscription }>(
    '/subscription/subscribe',
    {
      method: 'POST',
      body: { catalogId },
    },
  )
  return data.subscription
}
