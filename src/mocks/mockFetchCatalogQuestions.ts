import type { Question } from '@/sections/publicCatalog/actions/fetchCatalogQuestions'
import { pick, randomId, randomInt } from './random'

const QUESTIONS = [
  '¿Hacen envíos a todo el país?',
  '¿Cuánto cuesta el envío?',
  '¿Aceptan devoluciones?',
  '¿Cuánto tarda en llegar el pedido?',
  '¿Los productos son hechos a mano?',
  '¿Tienen talla más grande?',
  '¿Puedo pagar en efectivo al recoger?',
]

const ANSWERS = [
  'Sí, enviamos a toda la república mexicana.',
  'El envío depende de tu código postal. Escríbenos para cotizarte.',
  'Aceptamos devoluciones dentro de los primeros 7 días.',
  'De 3 a 5 días hábiles dentro de la CDMX.',
  null,
  null,
]

export function mockFetchCatalogQuestions(catalogId: string): Promise<Question[]> {
  const count = randomInt(2, 5)
  const now = Date.now()
  const questions: Question[] = Array.from({ length: count }, (_, i) => {
    const askedAt = new Date(now - randomInt(1, 30) * 24 * 60 * 60 * 1000).toISOString()
    return {
      id: `question_${randomId()}`,
      questionText: QUESTIONS[i % QUESTIONS.length],
      questionAnswer: pick(ANSWERS),
      userId: `user_${randomId()}`,
      catalogId,
      flag: null,
      createdOn: askedAt,
      updatedOn: askedAt,
    }
  })
  return Promise.resolve(questions)
}
