import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement, ReactNode } from 'react'

/**
 * A **fresh** `QueryClient` per test.
 *
 * Never share one. An entry written by an earlier test would satisfy a later
 * one's query, the action mock would go uncalled, and the test would pass for
 * the wrong reason — the worst failure mode a cache can give you.
 *
 * `retry: false` is required: with the app's `retry: 1`, an assertion about a
 * rejected action races the retry timer.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
}

/**
 * Wraps `ui` in a query provider. Routing stays with the caller — pages here are
 * rendered inside a `MemoryRouter` with the routes the test needs, and that
 * shape differs per suite.
 */
export function withQueryClient(ui: ReactNode, client = createTestQueryClient()) {
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>
}

/** `render`, plus the query provider. Returns the client so a test can inspect it. */
export function renderWithQuery(ui: ReactElement) {
  const client = createTestQueryClient()
  return { client, ...render(withQueryClient(ui, client)) }
}
