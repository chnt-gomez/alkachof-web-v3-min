import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { HelpCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/sections/auth/useAuth'
import { usePublicCatalog } from '../context/PublicCatalogContext'
import { useOwnerGuard } from '../hooks/useOwnerGuard'
import { fetchCatalogQuestions, type Question } from '../actions/fetchCatalogQuestions'
import { askQuestion } from '../actions/askQuestion'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function AskQuestionForm({
  onSubmit,
}: {
  onSubmit: (text: string) => Promise<void>
}) {
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isOwner, guard, ariaDisabled, blockedClass } = useOwnerGuard()

  const explainOwner = guard(
    'Este es tu catálogo: no puedes hacerte preguntas a ti mismo.',
    () => {},
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isOwner) {
      explainOwner()
      return
    }
    if (!text.trim()) {
      setError('Escribe tu pregunta antes de enviarla.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit(text.trim())
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la pregunta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      <label htmlFor="new-question" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Haz una pregunta
      </label>
      <textarea
        id="new-question"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          isOwner
            ? 'Las preguntas las escriben tus visitantes.'
            : '¿Qué te gustaría saber sobre este catálogo?'
        }
        rows={3}
        className={cn(
          'w-full resize-none rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
          blockedClass,
        )}
        disabled={isSubmitting || isOwner}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="submit"
        size="sm"
        className={cn('self-end', blockedClass)}
        disabled={isSubmitting}
        aria-disabled={ariaDisabled}
      >
        <Send size={14} />
        {isSubmitting ? 'Enviando…' : 'Enviar pregunta'}
      </Button>
    </form>
  )
}

function QuestionCard({ question }: { question: Question }) {
  return (
    <li className="rounded-xl border bg-card p-3">
      <p className="text-sm font-medium">{question.questionText}</p>
      <p className="mt-1 text-xs text-muted-foreground">{formatDate(question.createdOn)}</p>
      {question.questionAnswer ? (
        <div className="mt-2 rounded-md bg-muted p-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Respuesta
          </p>
          <p className="mt-1 text-sm">{question.questionAnswer}</p>
        </div>
      ) : (
        <p className="mt-2 text-xs italic text-muted-foreground">Sin respuesta aún.</p>
      )}
    </li>
  )
}

export function CatalogFaq() {
  const { catalog, isOwner } = usePublicCatalog()
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const catalogId = catalog?._id

  // The third of the three payloads the freshness stamp covers, so it shares
  // their key prefix and is invalidated with them by `usePublicCatalogFreshness`.
  const questionsQuery = useQuery({
    queryKey: queryKeys.publicCatalogQuestions(catalogId ?? ''),
    queryFn: () => fetchCatalogQuestions(catalogId as string),
    enabled: Boolean(catalogId),
    staleTime: Infinity,
    refetchOnMount: false,
  })

  const questions = questionsQuery.data ?? []
  const isLoading = questionsQuery.isLoading
  const error = questionsQuery.error?.message ?? null

  if (!catalog) return null

  async function handleAsk(text: string) {
    if (!catalogId) return
    const created = await askQuestion(catalogId, text)
    // The API's own answer, written straight in — no refetch to learn what we
    // were just told. Asking does move the server's stamp, so the next freshness
    // check will re-sync the whole subtree; that is correct, and costs one
    // refetch we could not have avoided without knowing the new stamp value.
    queryClient.setQueryData<Question[]>(queryKeys.publicCatalogQuestions(catalogId), (prev) => [
      created,
      ...(prev ?? []),
    ])
  }

  const visibleQuestions = isOwner
    ? questions
    : questions.filter((q) => q.flag !== 'inappropriate')

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <HelpCircle size={18} />
        Preguntas frecuentes
      </h2>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando preguntas…</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!isLoading && !error && visibleQuestions.length === 0 && (
        <p className="text-sm text-muted-foreground">Aún no hay preguntas.</p>
      )}

      {!isLoading && visibleQuestions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {visibleQuestions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </ul>
      )}

      {isAuthenticated ? (
        <AskQuestionForm onSubmit={handleAsk} />
      ) : (
        <p className="rounded-xl border border-dashed bg-card p-3 text-sm text-muted-foreground">
          Inicia sesión para hacer una pregunta al vendedor.
        </p>
      )}
    </section>
  )
}
