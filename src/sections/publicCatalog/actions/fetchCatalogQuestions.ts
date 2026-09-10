import { api } from '@/lib/api'

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
  const data = await api<{ questions: Question[] }>(`/catalog/${catalogId}/questions`, {
    authenticated: false,
  })
  return data.questions
}
