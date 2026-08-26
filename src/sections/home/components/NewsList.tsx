import { useState } from 'react'
import { Newspaper } from 'lucide-react'
import { formatRelative } from '@/lib/format'
import type { AdminMessage } from '../actions/fetchNews'
import { NewsDetailDialog } from './NewsDetailDialog'

type Props = {
  news: AdminMessage[]
}

/**
 * Admin announcements styled like notification rows, but with different
 * behavior: no seen state and no navigation — tapping a row opens a dialog
 * with the full announcement.
 *
 * **Deliberately no delete button, despite looking like a deletable
 * notification.** An announcement is a single global row every user reads —
 * there is no per-user copy — so "delete" here would not hide it for one
 * person, it would destroy it for everyone (and the API only lets an admin do
 * that at all). A notification, by contrast, is one user's private row, which
 * is what makes its trash button safe. Do not copy the trash affordance over
 * from `NotificationList` until per-user delivery of announcements exists.
 */
export function NewsList({ news }: Props) {
  const [selected, setSelected] = useState<AdminMessage | null>(null)

  if (news.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No hay noticias por el momento
      </p>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {news.map((item) => (
          <li key={item._id}>
            <button
              type="button"
              onClick={() => setSelected(item)}
              className="block w-full rounded-2xl text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Newspaper size={16} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{item.message}</span>
                  <time dateTime={item.date} className="text-xs text-muted-foreground">
                    {formatRelative(item.date)}
                  </time>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {selected && <NewsDetailDialog news={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
