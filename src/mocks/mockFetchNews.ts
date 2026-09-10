import type { News } from '@/sections/home/actions/fetchNews'
import { randomId, randomInt } from './random'

const ANNOUNCEMENTS: { title: string; message: string }[] = [
  {
    title: 'Nuevas opciones de pago',
    message:
      'A partir de hoy puedes aceptar transferencias bancarias en tus pedidos.\n\nActiva la opción desde tu catálogo en la sección de métodos de pago. Tus compradores verán la nueva opción al finalizar su pedido.',
  },
  {
    title: 'Mantenimiento programado',
    message:
      'El sábado 15 de agosto de 2:00 a 4:00 a.m. (hora del centro) la plataforma estará en mantenimiento. Durante ese periodo no será posible realizar pedidos.',
  },
  {
    title: 'Consejos para vender más',
    message:
      'Publicamos una guía con recomendaciones para mejorar las fotos de tus productos: usa luz natural, fondos limpios y muestra el producto en uso. Las fotos de buena calidad aumentan tus ventas hasta un 40 %.',
  },
  {
    title: 'Bienvenida a Alkachof',
    message:
      '¡Gracias por formar parte de la comunidad! Aquí publicaremos avisos importantes sobre la plataforma: nuevas funciones, mantenimientos y consejos para tu negocio.',
  },
]

/**
 * Newest first, matching the server's `date` desc ordering.
 *
 * The count varies per call on purpose: server-side each announcement carries a
 * `duration` and drops out of the feed when it runs out, so the real list
 * shrinks between two fetches with nothing having failed. Slicing from the top
 * mirrors that — the oldest rows are the ones that go — and `0` is a legitimate
 * answer (an empty feed is a 200, not an error). Nothing about the window is
 * computed here: `duration` is never sent to the client.
 */
export function mockFetchNews(): Promise<News[]> {
  const count = randomInt(0, ANNOUNCEMENTS.length)
  const news: News[] = ANNOUNCEMENTS.slice(0, count).map((announcement, index) => ({
    _id: randomId(),
    date: new Date(Date.now() - (index * 48 + randomInt(1, 24)) * 3_600_000).toISOString(),
    ...announcement,
  }))
  return Promise.resolve(news)
}
