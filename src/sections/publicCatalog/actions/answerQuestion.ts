import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockAnswerQuestion } from '@/mocks'
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
  if (IS_DEV_STAGE) return mockAnswerQuestion(catalogId, questionId, patch)
  const data = await api<{ message: string; question: Question }>(
    `/catalog/${catalogId}/question/${questionId}/answer`,
    {
      method: 'POST',
      body: patch,
    },
  )
  return data.question
}
