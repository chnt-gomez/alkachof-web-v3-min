import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUpdateCatalog } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

const BASE_URL = 'http://localhost:3001'

export async function updateCatalog(catalogId: string, patch: Partial<Catalog>): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockUpdateCatalog(catalogId, patch)
  const res = await fetch(`${BASE_URL}/catalog/${catalogId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Error al guardar catálogo (${res.status})`)
  const data = await res.json()
  return data.catalog
}
