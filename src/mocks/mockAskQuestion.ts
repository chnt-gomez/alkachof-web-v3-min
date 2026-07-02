import type { Question } from '@/sections/publicCatalog/actions/fetchCatalogQuestions'
import { randomId } from './random'

export function mockAskQuestion(catalogId: string, questionText: string): Promise<Question> {
  const now = new Date().toISOString()
  const question: Question = {
    id: `question_${randomId()}`,
    questionText,
    questionAnswer: null,
    userId: `user_${randomId()}`,
    catalogId,
    flag: null,
    createdOn: now,
    updatedOn: now,
  }
  return Promise.resolve(question)
}
