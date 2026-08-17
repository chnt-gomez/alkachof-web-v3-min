import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { formatRelative } from '@/lib/format'
import type { Chat, UserSummary } from '../types'
import { CounterpartyAvatar } from './CounterpartyAvatar'

export function ConversationRow({
  chat,
  counterparty,
  unread,
}: {
  chat: Chat
  counterparty: UserSummary | undefined
  unread: boolean
}) {
  const alias = counterparty?.alias ?? 'Usuario'

  return (
    <Link
      to={`/chats/${chat._id}`}
      className="flex items-center gap-3 rounded-2xl border p-3 transition-colors hover:bg-muted/60"
    >
      <CounterpartyAvatar summary={counterparty} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{alias}</p>
        <p className="truncate text-xs text-muted-foreground">
          Conversación iniciada {formatRelative(chat.createdOn)}
        </p>
      </div>
      {unread && <span aria-label="Sin leer" className="h-2.5 w-2.5 rounded-full bg-primary" />}
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </Link>
  )
}
