import { useState, type FormEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function MessageComposer({
  onSend,
  initialText = '',
}: {
  onSend: (text: string) => Promise<void>
  /** Prefilled draft text (e.g. an ice-breaker) the visitor can edit or send. */
  initialText?: string
}) {
  const [text, setText] = useState(initialText)
  const [sending, setSending] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    try {
      await onSend(body)
      setText('')
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 border-t bg-background/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur"
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe un mensaje..."
        aria-label="Mensaje"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={!text.trim() || sending}
        aria-label="Enviar mensaje"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
      >
        <SendHorizontal size={18} />
      </button>
    </form>
  )
}
