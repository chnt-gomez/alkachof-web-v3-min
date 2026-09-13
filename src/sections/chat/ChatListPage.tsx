import { Button } from '@/components/ui/button'
import { useChat } from './useChat'
import { ConversationRow } from './components/ConversationRow'

export function ChatListPage() {
  const { chats, status, counterpartyOf, isUnread, reload } = useChat()

  return (
    <div className="flex flex-col gap-4 p-5">
      <h1 className="text-2xl font-bold tracking-tight">Chats</h1>

      {status === 'loading' && <ListSkeleton />}
      {status === 'error' && <ListError onRetry={reload} />}
      {status === 'ready' &&
        (chats.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-2">
            {chats.map((chat) => (
              <li key={chat._id}>
                <ConversationRow
                  chat={chat}
                  counterparty={counterpartyOf(chat)}
                  unread={isUnread(chat._id)}
                />
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando chats">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  )
}

function ListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4"
    >
      <p className="text-sm text-destructive">No pudimos cargar tus conversaciones.</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

function EmptyState() {
  return (
    <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      Aún no tienes conversaciones. Escríbele a un vendedor desde su catálogo para empezar.
    </p>
  )
}
