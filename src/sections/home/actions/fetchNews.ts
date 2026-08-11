import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchNews } from '@/mocks'

/**
 * An admin announcement ("news"). Every logged-in user sees the same feed —
 * there is no read/seen state and no navigation target; tapping one opens a
 * detail dialog with the full message.
 */
export type AdminMessage = {
  _id: string
  /** Publication time (UTC ISO-8601), set by the server. */
  date: string
  title: string
  /** Plain-text body — render as text. */
  message: string
}

/**
 * All announcements, newest first (sorted server-side). Pull-based: no socket
 * push exists for news, so the dashboard refetches on load. Admin mutations
 * (`/news/create`, etc.) are intentionally not implemented here — they belong
 * to a future admin dashboard.
 */
export async function fetchNews(): Promise<AdminMessage[]> {
  if (IS_DEV_STAGE) return mockFetchNews()
  const data = await api<{ adminMessages: AdminMessage[] }>('/news')
  return data.adminMessages
}
