import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockAskQuestion } from '@/mocks'
import type { Question } from './fetchCatalogQuestions'

export async function askQuestion(catalogId: string, questionText: string): Promise<Question> {
  if (IS_DEV_STAGE) return mockAskQuestion(catalogId, questionText)
  const data = await api<{ message: string; question: Question }>(
    `/catalog/${catalogId}/ask`,
    {
      method: 'POST',
      body: { questionText },
    },
  )
  return data.question
}
