import { api } from '@/lib/api'
import type { Question, QuestionFlag } from './fetchCatalogQuestions'

export type AnswerQuestionPatch = {
  questionAnswer?: string | null
  flag?: QuestionFlag
}

export async function answerQuestion(
  catalogId: string,
  questionId: string,
  patch: AnswerQuestionPatch,
): Promise<Question> {
  const data = await api<{ message: string; question: Question }>(
    `/catalog/${catalogId}/question/${questionId}/answer`,
    {
      method: 'POST',
      body: patch,
    },
  )
  return data.question
}
