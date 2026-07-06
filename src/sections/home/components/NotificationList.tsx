import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification } from '../actions/fetchNotifications'

type Props = { notifications: Notification[] }

export function NotificationList({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nada por el momento
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {notifications.map((notification) => (
        <li
          key={notification._id}
          className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Bell size={16} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className={cn('text-sm', !notification.read && 'font-semibold')}>
              {notification.message}
            </span>
            <time dateTime={notification.createdAt} className="text-xs text-muted-foreground">
              {formatDate(notification.createdAt)}
            </time>
          </span>
        </li>
      ))}
    </ul>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
}
