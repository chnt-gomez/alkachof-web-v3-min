import { api } from '@/lib/api'
import type { Subscription } from './fetchUserSubscriptions'

export async function subscribe(catalogId: string): Promise<Subscription> {
  const data = await api<{ message: string; subscription: Subscription }>(
    '/subscription/subscribe',
    {
      method: 'POST',
      body: { catalogId },
    },
  )
  return data.subscription
}
