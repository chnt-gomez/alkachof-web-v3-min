import type { Question } from '@/sections/publicCatalog/actions/fetchCatalogQuestions'
import type { AnswerQuestionPatch } from '@/sections/publicCatalog/actions/answerQuestion'
import { randomId } from './random'

export function mockAnswerQuestion(
  catalogId: string,
  questionId: string,
  patch: AnswerQuestionPatch,
): Promise<Question> {
  const now = new Date().toISOString()
  const question: Question = {
    id: questionId,
    questionText: '¿Pregunta original?',
    questionAnswer: patch.questionAnswer ?? null,
    userId: `user_${randomId()}`,
    catalogId,
    flag: patch.flag ?? null,
    createdOn: now,
    updatedOn: now,
  }
  return Promise.resolve(question)
}
