import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchCarts } from '@/mocks'
import type { Cart } from '../types'

export async function fetchCarts(): Promise<Cart[]> {
  if (IS_DEV_STAGE) return mockFetchCarts()
  const data = await api<{ carts: Cart[] }>('/cart')
  return data.carts
}
