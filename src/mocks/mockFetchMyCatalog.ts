import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { mockFetchMyCatalogs } from './mockFetchMyCatalogs'

// The owner always has one catalog; reuse the shared cache so the editor and the
// Home list resolve to the same catalog in dev stage.
export async function mockFetchMyCatalog(): Promise<Catalog> {
  const [catalog] = await mockFetchMyCatalogs()
  return catalog
}
