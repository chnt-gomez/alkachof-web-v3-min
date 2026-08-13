import { useCallback, useEffect, useState } from 'react'
import { fetchCatalogQuestions, type Question } from '@/sections/publicCatalog/actions/fetchCatalogQuestions'
import { answerQuestion } from '@/sections/publicCatalog/actions/answerQuestion'

export type OwnerQuestionsStatus = 'loading' | 'ready' | 'error'

/** A question is pending while it has no answer (and isn't flagged out). */
function isUnanswered(q: Question): boolean {
  return q.questionAnswer === null && q.flag !== 'inappropriate'
}

/**
 * Owner-side view of the questions that still need a reply. Loads the catalog's
 * questions, keeps only the unanswered ones, and posts answers — an answered
 * question drops off the list immediately.
 */
export function useOwnerQuestions(catalogId: string | undefined) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [status, setStatus] = useState<OwnerQuestionsStatus>('loading')

  const load = useCallback(async () => {
    if (!catalogId) return
    setStatus('loading')
    try {
      const all = await fetchCatalogQuestions(catalogId)
      setQuestions(all.filter(isUnanswered))
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [catalogId])

  useEffect(() => {
    void load()
  }, [load])

  const answer = useCallback(
    async (questionId: string, text: string) => {
      if (!catalogId) return
      await answerQuestion(catalogId, questionId, { questionAnswer: text })
      // Now answered — remove it from the pending list.
      setQuestions((prev) => prev.filter((q) => q.id !== questionId))
    },
    [catalogId],
  )

  return { questions, status, reload: load, answer }
}
