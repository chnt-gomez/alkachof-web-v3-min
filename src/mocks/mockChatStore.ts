import type { Chat, ChatMessage, UserSummary } from '@/sections/chat/types'
import { randomId } from './random'

// Shared in-memory chat state for dev stage, so the conversation list, thread
// history, find-or-create, and optimistic sends all stay consistent within a
// session (send a message -> reopen -> it is still there).
//
// A fixed sentinel id represents "me". Bubble direction in dev is driven by the
// stored `type` (history) and by forced `outgoing` on send — never by matching
// against the (randomly generated) mock profile id — so this sentinel never
// needs to equal the real profile's userId.
const ME = 'me'

type StoredMessage = ChatMessage
type StoredChat = {
  chat: Chat
  /** The counterparty user id (the non-"me" member). */
  counterpartyId: string
  messages: StoredMessage[]
}

const store = new Map<string, StoredChat>()

// Seeded counterparties with friendly es-MX aliases + avatars.
const PEOPLE: UserSummary[] = [
  { userId: 'user_rosa', alias: 'Rosa — Rebozos Oaxaca', avatarUrl: 'https://picsum.photos/seed/rosa/200/200' },
  { userId: 'user_miguel', alias: 'Miguel — Alebrijes', avatarUrl: 'https://picsum.photos/seed/miguel/200/200' },
  { userId: 'user_lupita', alias: 'Lupita — Dulces La Abuela', avatarUrl: 'https://picsum.photos/seed/lupita/200/200' },
]

type Seed = {
  counterparty: UserSummary
  daysAgo: number
  messages: { from: 'me' | 'them'; text: string; minutesAgo: number }[]
}

const SEEDS: Seed[] = [
  {
    counterparty: PEOPLE[0],
    daysAgo: 0,
    messages: [
      { from: 'them', text: '¡Hola! Gracias por tu interés en los rebozos 🧣', minutesAgo: 90 },
      { from: 'me', text: '¡Hola Rosa! ¿Todavía tienes el rebozo azul disponible?', minutesAgo: 80 },
      { from: 'them', text: 'Sí, claro. Lo tengo en tres tonos de azul.', minutesAgo: 60 },
      { from: 'me', text: 'Perfecto, ¿me lo puedes apartar?', minutesAgo: 12 },
    ],
  },
  {
    counterparty: PEOPLE[1],
    daysAgo: 2,
    messages: [
      { from: 'me', text: 'Buenas, ¿hacen envíos a Monterrey?', minutesAgo: 60 * 48 },
      { from: 'them', text: '¡Claro que sí! El envío tarda entre 3 y 5 días.', minutesAgo: 60 * 47 },
    ],
  },
  {
    counterparty: PEOPLE[2],
    daysAgo: 5,
    messages: [
      { from: 'them', text: 'Tu pedido de cajetas ya está listo para recoger 🍯', minutesAgo: 60 * 24 * 5 },
    ],
  },
]

function buildMessage(chatId: string, counterpartyId: string, seed: Seed['messages'][number]): StoredMessage {
  const outgoing = seed.from === 'me'
  return {
    _id: randomId(),
    chatId,
    sender: outgoing ? ME : counterpartyId,
    message: seed.text,
    sent: new Date(Date.now() - seed.minutesAgo * 60_000).toISOString(),
    type: outgoing ? 'outgoing' : 'incoming',
  }
}

let seeded = false
function ensureSeeded() {
  if (seeded) return
  for (const seed of SEEDS) {
    const chatId = randomId()
    const createdOn = new Date(Date.now() - seed.daysAgo * 86_400_000).toISOString()
    store.set(chatId, {
      chat: { _id: chatId, users: [ME, seed.counterparty.userId], createdOn, status: 'active' },
      counterpartyId: seed.counterparty.userId,
      messages: seed.messages.map((m) => buildMessage(chatId, seed.counterparty.userId, m)),
    })
  }
  seeded = true
}

/** Chats sorted by most-recent activity (last message, else createdOn) first. */
export function getRecentChats(): Chat[] {
  ensureSeeded()
  return Array.from(store.values())
    .sort((a, b) => lastActivity(b) - lastActivity(a))
    .map((s) => s.chat)
}

function lastActivity(s: StoredChat): number {
  const last = s.messages[s.messages.length - 1]
  return new Date(last?.sent ?? s.chat.createdOn).getTime()
}

export function getMessages(chatId: string): ChatMessage[] {
  ensureSeeded()
  return store.get(chatId)?.messages ?? []
}

/** Append an outgoing message and return it. */
export function appendMessage(chatId: string, message: string): ChatMessage {
  ensureSeeded()
  const entry = store.get(chatId)
  const msg: StoredMessage = {
    _id: randomId(),
    chatId,
    sender: ME,
    message,
    sent: new Date().toISOString(),
    type: 'outgoing',
  }
  if (entry) entry.messages.push(msg)
  return msg
}

/** Find-or-create a chat with `toUserId`; returns the (existing or new) chat. */
export function findOrCreateChat(toUserId: string): Chat {
  ensureSeeded()
  const existing = Array.from(store.values()).find((s) => s.counterpartyId === toUserId)
  if (existing) return existing.chat
  const chatId = randomId()
  const chat: Chat = {
    _id: chatId,
    users: [ME, toUserId],
    createdOn: new Date().toISOString(),
    status: 'active',
  }
  store.set(chatId, { chat, counterpartyId: toUserId, messages: [] })
  return chat
}

/**
 * Friendly display info for user ids. Seeded people get their real alias;
 * any other id (e.g. a catalog owner reached via "Contactar") gets a stable
 * deterministic name so the UI never shows a raw id.
 */
export function getUserSummaries(userIds: string[]): Record<string, UserSummary> {
  const known = new Map(PEOPLE.map((p) => [p.userId, p]))
  const out: Record<string, UserSummary> = {}
  for (const id of userIds) {
    out[id] =
      known.get(id) ??
      { userId: id, alias: `Vendedor ${id.slice(0, 4)}`, avatarUrl: `https://picsum.photos/seed/${id}/200/200` }
  }
  return out
}
