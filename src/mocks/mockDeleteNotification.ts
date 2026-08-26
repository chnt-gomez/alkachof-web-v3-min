// Deleting is fire-and-forget server-side (200 with a message, nothing to echo).
// There is no mock store, so the dev stage just accepts it — the provider drops
// the row optimistically either way.
export function mockDeleteNotification(id: string): Promise<void> {
  void id
  return Promise.resolve()
}
