import type { Question } from '@/sections/publicCatalog/actions/fetchCatalogQuestions'
import { randomId } from './random'
import { bumpCatalogStamp } from './mockCatalogStampStore'

export function mockAskQuestion(catalogId: string, questionText: string): Promise<Question> {
  bumpCatalogStamp(catalogId)
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
