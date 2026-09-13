// Domain types for the private chat feature. Mirrors the REST contract in
// `followup.ChatApi.md` exactly — do not add fields the API does not return.

/** A 1:1 private chat. `users` holds exactly two user ids. */
export type Chat = {
  _id: string
  /** The two member user ids. The counterparty is whichever id is not mine. */
  users: string[]
  createdOn: string
  /** Server status; `active` today. Kept as string to tolerate future values. */
  status: string
}

/**
 * Bubble direction relative to the caller. History reads include this
 * server-computed; the socket payload omits it (compute from `sender` there).
 */
export type MessageType = 'incoming' | 'outgoing'

export type ChatMessage = {
  _id: string
  chatId: string
  /** Author's user id. */
  sender: string
  message: string
  /** UTC ISO-8601 timestamp. */
  sent: string
  type: MessageType
}

/**
 * Display info for a counterparty. The chat API returns no names yet (known
 * gap in the contract), so this is resolved through a separate seam —
 * `fetchUserSummaries` — rather than off the chat payload.
 */
export type UserSummary = {
  userId: string
  alias: string
  avatarUrl?: string
}
