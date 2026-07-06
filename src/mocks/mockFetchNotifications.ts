import type { Notification } from '@/sections/home/actions/fetchNotifications'
import { pick, randomId, randomInt } from './random'

const MESSAGES = [
  'Tienes una nueva pregunta en tu catálogo',
  'Respondieron a la pregunta que hiciste',
  'Tu producto "Rebozo de Colores" recibió nuevas visitas',
  'Un comprador guardó tu catálogo',
]

export function mockFetchNotifications(): Promise<Notification[]> {
  const notifications: Notification[] = Array.from({ length: randomInt(0, 3) }, () => ({
    _id: randomId(),
    message: pick(MESSAGES),
    createdAt: new Date(Date.now() - randomInt(1, 72) * 3_600_000).toISOString(),
    read: Math.random() < 0.5,
  }))
  return Promise.resolve(notifications)
}
