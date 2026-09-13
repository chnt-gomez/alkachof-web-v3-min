import { api } from '@/lib/api'
import type { Question } from './fetchCatalogQuestions'

export async function askQuestion(catalogId: string, questionText: string): Promise<Question> {
  const data = await api<{ message: string; question: Question }>(
    `/catalog/${catalogId}/ask`,
    {
      method: 'POST',
      body: { questionText },
    },
  )
  return data.question
}
