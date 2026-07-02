import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchCatalogQuestions } from '@/mocks'

export type QuestionFlag = 'inappropriate' | 'not_a_question' | 'not_help' | null

export type Question = {
  id: string
  questionText: string
  questionAnswer: string | null
  userId: string
  catalogId: string
  flag: QuestionFlag
  createdOn: string
  updatedOn: string
}

export async function fetchCatalogQuestions(catalogId: string): Promise<Question[]> {
  if (IS_DEV_STAGE) return mockFetchCatalogQuestions(catalogId)
  const data = await api<{ questions: Question[] }>(`/catalog/${catalogId}/questions`, {
    authenticated: false,
  })
  return data.questions
}
