import { cn } from '@/lib/utils'
import type { ChatMessage } from '../types'

const timeFormatter = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' })

export function MessageBubble({ message }: { message: ChatMessage }) {
  const outgoing = message.type === 'outgoing'

  return (
    <li className={cn('flex', outgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
          outgoing
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.message}</p>
        <span
          className={cn(
            'mt-1 block text-right text-[10px]',
            outgoing ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {timeFormatter.format(new Date(message.sent))}
        </span>
      </div>
    </li>
  )
}
