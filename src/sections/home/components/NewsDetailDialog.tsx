import { Dialog } from '@/components/ui/dialog'
import { formatDate } from '@/lib/format'
import type { AdminMessage } from '../actions/fetchNews'

type Props = {
  news: AdminMessage
  onClose: () => void
}

export function NewsDetailDialog({ news, onClose }: Props) {
  return (
    <Dialog onClose={onClose} ariaLabel={news.title} title={news.title}>
      <div className="flex flex-col gap-3 px-5 py-4">
        <time dateTime={news.date} className="text-xs text-muted-foreground">
          {formatDate(news.date)}
        </time>
        <p className="whitespace-pre-line text-sm">{news.message}</p>
      </div>
    </Dialog>
  )
}
