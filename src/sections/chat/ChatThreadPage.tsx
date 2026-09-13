import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from './useChat'
import { CounterpartyAvatar } from './components/CounterpartyAvatar'
import { MessageBubble } from './components/MessageBubble'
import { MessageComposer } from './components/MessageComposer'

/** Navigation state passed to the draft route (`/chats/new`) by "Contactar". */
type DraftState = { toUserId?: string; toAlias?: string; prefill?: string }

/**
 * Full-screen conversation view. Handles two modes:
 *  - existing chat (`/chats/:chatId`) — loads history, sends normally;
 *  - draft (`/chats/new`) — no chat exists yet, composer is prefilled with an
 *    ice-breaker, and nothing is persisted until the visitor actually sends.
 *    On first send we find-or-create the chat, post the message, then swap the
 *    URL to the real thread. Abandoning the draft leaves no empty chat behind.
 *
 * Rendered outside `NavShell` (its own back button replaces the bottom tabs) so
 * the composer owns the bottom of the viewport.
 */
export function ChatThreadPage() {
  const { chatId: chatIdParam } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    chats,
    summaries,
    counterpartyOf,
    findChatWith,
    createChatWith,
    messagesFor,
    threadStatusFor,
    loadMessages,
    sendMessage,
    markChatRead,
  } = useChat()

  const isDraft = !chatIdParam
  const draft = (location.state as DraftState | null) ?? {}

  // A draft opened for someone we already have a chat with should just resume
  // that thread (belt-and-braces: "Contactar" already checks this up front).
  const existingForDraft = isDraft && draft.toUserId ? findChatWith(draft.toUserId) : undefined
  useEffect(() => {
    if (existingForDraft) navigate(`/chats/${existingForDraft._id}`, { replace: true })
  }, [existingForDraft, navigate])

  // Guard against landing on /chats/new with no target (e.g. a direct URL).
  useEffect(() => {
    if (isDraft && !draft.toUserId) navigate('/chats', { replace: true })
  }, [isDraft, draft.toUserId, navigate])

  const chatId = chatIdParam ?? ''
  const chat = chats.find((c) => c._id === chatId)
  const counterparty = isDraft
    ? draft.toUserId
      ? summaries[draft.toUserId]
      : undefined
    : chat
      ? counterpartyOf(chat)
      : undefined
  const alias = counterparty?.alias ?? draft.toAlias ?? 'Usuario'

  const messages = isDraft ? [] : messagesFor(chatId)
  const status = isDraft ? 'ready' : threadStatusFor(chatId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isDraft && chatId) void loadMessages(chatId)
  }, [isDraft, chatId, loadMessages])

  // Clear unread on open and again whenever a new message lands while viewing.
  useEffect(() => {
    if (!isDraft && chatId) markChatRead(chatId)
  }, [isDraft, chatId, markChatRead, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  // Existing thread sends straight through; a draft persists on first send only.
  const handleSend = async (text: string) => {
    if (!isDraft) {
      await sendMessage(chatId, text)
      return
    }
    if (!draft.toUserId) return
    const newId = await createChatWith(draft.toUserId)
    await sendMessage(newId, text)
    navigate(`/chats/${newId}`, { replace: true })
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-3 py-2.5 backdrop-blur">
        <Link
          to="/chats"
          aria-label="Volver a los chats"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft size={22} />
        </Link>
        <CounterpartyAvatar summary={counterparty} size={36} />
        <p className="min-w-0 flex-1 truncate font-semibold">{alias}</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {status === 'loading' && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando mensajes">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-10 w-2/3 animate-pulse rounded-2xl bg-muted ${i % 2 ? 'self-end' : ''}`}
              />
            ))}
          </div>
        )}
        {status === 'error' && (
          <div role="alert" className="flex flex-col items-center gap-3 pt-8">
            <p className="text-sm text-destructive">No pudimos cargar los mensajes.</p>
            <Button size="sm" variant="outline" onClick={() => loadMessages(chatId)}>
              Reintentar
            </Button>
          </div>
        )}
        {status === 'ready' &&
          (messages.length === 0 ? (
            <p className="pt-8 text-center text-sm text-muted-foreground">
              {isDraft
                ? 'Envía tu primer mensaje para iniciar la conversación.'
                : 'Aún no hay mensajes en esta conversación.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {messages.map((m) => (
                <MessageBubble key={m._id} message={m} />
              ))}
            </ul>
          ))}
        <div ref={bottomRef} />
      </main>

      {/* A prefill is honoured on an existing thread too, not just a draft: a
          service request carries the buyer's note, and they may already have a
          conversation with this seller. Threads opened normally pass no state,
          so this stays empty for them. */}
      <MessageComposer onSend={handleSend} initialText={draft.prefill ?? ''} />
    </div>
  )
}
