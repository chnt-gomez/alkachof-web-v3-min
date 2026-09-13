/**
 * Every cache key in the app.
 *
 * Keys are built here and nowhere else, so two call sites can never disagree on
 * one — the whole point of the cache is that the Home tile and the catalog
 * editor land on the *same* entry. They are hierarchical so a prefix can
 * invalidate a subtree.
 *
 * **If a query is not in this file, it is not cached.** Anything owned by
 * somebody else — the public catalog, questions, orders, chat — is deliberately
 * absent: those rows have a different staleness contract and must not inherit
 * the defaults in `queryClient.ts`.
 */
export const queryKeys = {
  /** The authenticated user's own profile. */
  profile: () => ['profile'] as const,
  /** The authenticated owner's catalog — every user has exactly one. */
  myCatalog: () => ['catalog', 'mine'] as const,
  /** The items of one catalog, owner view. */
  catalogItems: (catalogId: string) => ['catalog', catalogId, 'items'] as const,
  /**
   * `/instagram/status`, the section's only unmetered endpoint. The feed
   * (`/instagram/posts`) is a billed scraper run and is deliberately **not**
   * cached — see `fetchInstagramPosts`.
   */
  instagramStatus: () => ['instagram', 'status'] as const,

  /** The viewer's own subscription rows. Owner-owned: only this client writes them. */
  subscriptions: () => ['subscriptions'] as const,

  /* --- Someone else's shop ------------------------------------------------
   *
   * The public catalog is the one cached thing this user does not write, so it
   * cannot use the defaults in `queryClient.ts`. It is safe to cache only
   * because `GET /updated/:id` makes "did anything change?" a ~80-byte question
   * — see `usePublicCatalogFreshness`.
   *
   * `publicCatalog(id)` doubles as the invalidation **prefix** over exactly the
   * three payloads the stamp covers together — metadata, items and questions.
   * One stamp, one invalidate.
   */
  publicCatalog: (catalogId: string) => ['catalog', 'public', catalogId] as const,
  publicCatalogItems: (catalogId: string) => ['catalog', 'public', catalogId, 'items'] as const,
  publicCatalogQuestions: (catalogId: string) =>
    ['catalog', 'public', catalogId, 'questions'] as const,

  /**
   * The freshness stamp as the server currently reports it. A **sibling** of the
   * payload prefix, not a child: nested under it, every payload invalidation
   * would also refetch the stamp and get the same value back — one wasted
   * request per change, forever.
   */
  catalogStamp: (catalogId: string) => ['catalog', 'stamp', catalogId] as const,

  /**
   * The stamp the *currently cached payload* was fetched against.
   *
   * This is the handoff's rule 2 ("store the stamp with the payload") made
   * durable. A `useRef` would do within one mount, but it dies on reload — and a
   * restored payload with no recorded stamp cannot be checked, so the first
   * change after a cold start would be missed entirely. Persisted alongside the
   * payloads, in the same atomic blob, so the two can never disagree.
   */
  catalogSynced: (catalogId: string) => ['catalog', 'synced', catalogId] as const,

  /**
   * A catalog's location. Its own scope, and deliberately **outside** the
   * `publicCatalog` prefix, because it is the one visitor-facing thing the
   * freshness stamp does not cover: editing a location does not move the stamp
   * (`followup.CatalogLocationStamp.md` is the ask to fix that).
   *
   * So it is bounded by time instead of by the stamp, and it is **never
   * persisted** — a wrong address is the one staleness here with a real-world
   * cost, and a reload must always re-read it. See `useCatalogLocation`.
   */
  catalogLocation: (catalogId: string) => ['catalog', 'location', catalogId] as const,

  /* --- Deliberately absent: the news feed ---------------------------------
   *
   * TODO(cache): admin announcements stay on component state (`useAsyncSection`
   * in `HomePage`) until the API grows a freshness endpoint for them —
   * `followup.NewsCacheStamp.md` is the ask.
   *
   * They cannot use the defaults in `queryClient.ts`. News changes on a clock
   * this client cannot see: an announcement expires when its server-side
   * `duration` runs out, or the moment an admin retracts it, and neither event
   * is anything the user did here. With `staleTime: Infinity` a retracted
   * announcement would keep rendering for a whole `gcTime`; on disk it would
   * render forever. One fetch per mount is not an oversight — it is what makes
   * an expiry observable at all.
   *
   * Adding a key here therefore means picking a real `staleTime` and writing
   * down why, the way `queryClient.ts` asks — or better, waiting for the stamp
   * and gating it the way `publicCatalog` is gated.
   */
}
