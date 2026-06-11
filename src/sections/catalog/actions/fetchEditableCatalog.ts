import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchEditableCatalog } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export type { Catalog }

const BASE_URL = 'http://localhost:3001'

export async function fetchEditableCatalog(catalogId: string): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockFetchEditableCatalog(catalogId)
  const res = await fetch(`${BASE_URL}/catalog/${catalogId}`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Catálogo no encontrado (${res.status})`)
  const data = await res.json()
  return data.catalog
}
