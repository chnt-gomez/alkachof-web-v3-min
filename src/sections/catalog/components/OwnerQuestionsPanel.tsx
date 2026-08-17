import { useState, type FormEvent } from 'react'
import { MessageCircleQuestion, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/lib/format'
import { useEditCatalog } from '../context/EditCatalogContext'
import { useOwnerQuestions } from '../hooks/useOwnerQuestions'
import type { Question } from '@/sections/publicCatalog/actions/fetchCatalogQuestions'

/**
 * Owner panel listing only the questions that still need a reply, each with an
 * inline answer field. Lives at the bottom of the owner's catalog editor.
 */
export function OwnerQuestionsPanel() {
  const { catalog } = useEditCatalog()
  const { questions, status, reload, answer } = useOwnerQuestions(catalog?._id)

  return (
    <section className="flex flex-col gap-3" aria-labelledby="owner-questions-heading">
      <div className="flex items-center gap-2">
        <MessageCircleQuestion size={20} className="text-primary" />
        <h2 id="owner-questions-heading" className="text-lg font-bold tracking-tight">
          Preguntas por responder
        </h2>
        {status === 'ready' && questions.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
            {questions.length}
          </span>
        )}
      </div>

      {status === 'loading' && (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando preguntas">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4"
        >
          <p className="text-sm text-destructive">No pudimos cargar las preguntas.</p>
          <Button size="sm" variant="outline" onClick={reload}>
            Reintentar
          </Button>
        </div>
      )}

      {status === 'ready' &&
        (questions.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No tienes preguntas pendientes por responder.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {questions.map((q) => (
              <li key={q.id}>
                <QuestionAnswerCard question={q} onAnswer={(text) => answer(q.id, text)} />
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}

function QuestionAnswerCard({
  question,
  onAnswer,
}: {
  question: Question
  onAnswer: (text: string) => Promise<void>
}) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onAnswer(body)
      // On success the card unmounts (question leaves the pending list).
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la respuesta.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border p-4">
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{question.questionText}</p>
        <span className="text-xs text-muted-foreground">
          Preguntado {formatRelative(question.createdOn)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe tu respuesta..."
          aria-label={`Respuesta a: ${question.questionText}`}
          rows={2}
          className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-2 text-sm shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={!text.trim() || submitting} className="self-end gap-2">
          <Send size={14} />
          {submitting ? 'Enviando...' : 'Responder'}
        </Button>
      </form>
    </div>
  )
}
