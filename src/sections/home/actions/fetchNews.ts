import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchNews } from '@/mocks'

/**
 * An admin announcement ("news"). Every logged-in user sees the same feed —
 * there is no read/seen state and no navigation target; tapping one opens a
 * detail dialog with the full message.
 *
 * This is the whole shape. The server also holds a `duration` and a `deleted`
 * flag and **deliberately sends neither**: they decide whether a row is served
 * at all, and once it has been served they say nothing useful. Do not add them
 * so a card can count down or hide itself — the server is the only thing that
 * decides what is live, and a second implementation here would drift from it.
 */
export type News = {
  _id: string
  /** Publication time (UTC ISO-8601), set by whoever published it. */
  date: string
  title: string
  /** Plain-text body — render as text, never as HTML. */
  message: string
}

/**
 * The live announcements, newest first (sorted server-side — do not re-sort).
 *
 * Pull-only: there is no socket push for news, unlike notifications. An empty
 * feed is a `200` with `{ news: [] }`, and the list **shrinks on its own** as
 * announcements pass their duration or are retracted by an admin — a row
 * present on one fetch may be absent from the next with nothing having failed.
 *
 * There are no news mutations, here or anywhere: `/news/create`, `/news/:id/update`
 * and `/news/:id/delete` were removed from the API and answer 404. An
 * announcement reaches every user at once, so a write path behind an admin
 * token is a way to broadcast to the whole population with one stolen
 * credential. Announcements are inserted by a sysadmin against the database.
 * Do not build a composer, an editor or a delete control, not even scaffolding.
 *
 * `GET /news/:id` exists and has no caller: `NewsList` opens its dialog from
 * the list it already holds, because the full `message` is in this payload.
 * Unused is not dead — it is there for a future deep link. Do not start calling
 * it just because it exists.
 *
 * TODO(cache): news is not on React Query and not persisted, and that is what
 * keeps expiry observable today — one fetch per mount, via `useAsyncSection`.
 * Caching it needs a freshness endpoint the API does not have yet; the ask is
 * `followup.NewsCacheStamp.md`. Until it ships, do not move this onto React
 * Query with the app's `staleTime: Infinity` default and do not add it to
 * `PERSISTED_KEYS` — either one renders an expired or retracted announcement
 * long after the server stopped serving it.
 */
export async function fetchNews(): Promise<News[]> {
  if (IS_DEV_STAGE) return mockFetchNews()
  const data = await api<{ news: News[] }>('/news')
  return data.news
}
