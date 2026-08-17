import type { CatalogSummary } from '@/sections/transactions/actions/fetchCatalogSummaries'
import { getCatalogSummaries } from './mockTransactionStore'

export function mockFetchCatalogSummaries(
  catalogIds: string[],
): Promise<Record<string, CatalogSummary>> {
  return Promise.resolve(getCatalogSummaries(catalogIds))
}
