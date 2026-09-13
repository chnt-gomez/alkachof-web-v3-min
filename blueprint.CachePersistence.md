# Blueprint — Phase 5: Cache persistence

Phase 5 of `epic.LocalCahing.md` / `blueprint.LocalCaching.md`. Phases 1–4 are shipped;
this is the one that survives a reload, and the one with a genuinely different risk
profile from everything before it.

**Status: ✅ shipped.** Approved with the recommended defaults (Option A, D1–D8,
§3's split). §12 records what changed during implementation — one decision was
overturned by a test.

---

## 0. Where we actually are

Phases 1–4 took the sample session from 12 in-scope requests to **4**: one read each
of `/profile`, `/catalog`, `/catalog/:id/items`, `/instagram/status`. That 4 is the
floor for an in-memory cache — it dies with the tab.

So the honest scope of Phase 5 is narrow:

| | Today | With persistence |
|---|---|---|
| Navigating between screens | 0 requests | 0 |
| **Reload / PWA cold start / OS killed the tab** | **4 requests** | 0–2 |
| First boot on a device | 4 | 4 |

Everything Phase 5 can win happens at a **cold start**. How often that is for
Alkachof's users is the one number that decides whether this is worth doing, and it
is in the measurements the epic was written from, not in this repo. **Check it before
approving §2.**

> **Answered 2026-09-08: cold starts are not expected to be common.** See §12 — this
> phase shipped anyway, but it is the least valuable of the five and nothing else
> depends on it.

### The part that is not about request counts

`ProtectedRoute` renders a full-page skeleton while `isBooting` is true
(`src/router/ProtectedRoute.tsx:9`), and `isBooting` is true until `/profile`
answers. On a cold start on mobile data that is the user staring at grey boxes
waiting on one request.

Persisting the profile removes that gate — the app paints from disk immediately.
**This is a bigger prize than the two saved requests**, and it is worth keeping the
two motivations separate, because §3 shows they can be bought independently.

---

## 1. Why the epic asked for this at all

Opportunity 1 said, verbatim: *"After a successful import, save the available date to
a cookie or use TanStack Query to cache the available date."*

Phases 1–2 satisfied the second half within a session. They do **not** satisfy the
first half: reload the app and `/instagram/status` is read again. So the epic's
opportunity 1 is, strictly, still open — and it is the one endpoint on the list that
guards a **billed** call. That is the strongest single argument for Phase 5.

(For the record: **a cookie is the wrong container.** It would be sent on every
request to `api.alkachof.mx`, costs ~4 KB of the request budget on mobile data, and
buys nothing localStorage does not. Where the epic says "cookie", read "on disk".)

---

## 2. The three options

### Option A — whole-cache persistence with a closed allowlist

`PersistQueryClientProvider` + `createSyncStoragePersister` (both 5.102.8, peer-
compatible with the installed `@tanstack/react-query`). The client dehydrates to one
localStorage blob; `shouldDehydrateQuery` limits which keys go in.

| Pros | Cons |
|---|---|
| Composes: adding a key to the allowlist later is one line | Adds a rehydration-type trap (R1) — the single most dangerous item on this list |
| Removes the `isBooting` gate → instant paint | Puts seller data on disk, outliving the tab (R4) |
| Closes the epic's opportunity 1 properly | Turns a multi-tab UI inconsistency into data on disk (R2) |
| One mechanism, one place to reason about | Contradicts the dev-stage mocks unless disabled there (R3) |
| Library-maintained; restore, throttling and `maxAge` are solved | Two new dependencies |

### Option B — targeted micro-persistence, Instagram date only

No persister. A purpose-built `localStorage` key holding one ISO string, read as
`initialData` for the status query.

| Pros | Cons |
|---|---|
| Minimal surface: one string, no dehydrate/rehydrate, no type trap | Bespoke machinery that does not compose — a second resource means a second copy of it |
| No PII on disk | Does **not** fix the boot paint, which is the bigger prize |
| Trivially dev-stage-safe | Hand-rolls what a maintained library already does (throttling, maxAge, versioning) |
| Answers the epic's literal ask, and nothing more | We would likely still want A later, and then this is dead code |

### Option C — defer

| Pros | Cons |
|---|---|
| No new risk. Phases 1–4 already delivered 12 → 4 | Opportunity 1 stays open; a reload still spends the guarded read |
| The cold-start frequency may make this genuinely marginal | The `isBooting` skeleton stays on the critical path |

### Recommendation

**Option A, with the narrowest allowlist that buys both prizes** — and only if the
cold-start numbers justify it. B is tempting for its small surface, but its main
advantage (no type trap) disappears under decision **D3** below, and it leaves the
paint win on the table.

If the team wants minimum new surface this quarter, **C is a defensible stop.**
Phases 1–4 delivered the epic's measurable goal; Phase 5 is the tail.

---

## 3. The crux: paint and call-saving are separable

This is the decision most likely to be made by accident, so it gets its own section.

A persisted query can behave two ways on boot:

- **Persist and revalidate.** Render from disk instantly, refetch in the background.
  → Full paint win. **Zero request saving** — the call still happens, it just no
  longer blocks anything.
- **Persist and trust.** Render from disk, do not refetch (our defaults:
  `staleTime: Infinity`, `refetchOnMount: false`).
  → Paint win **and** request saving. The row can now be wrong for as long as the
  cache lives.

They are not the same trade, and the right answer differs per resource:

| Key | Recommend | Why |
|---|---|---|
| `['profile']` | **persist + revalidate** | It is on the blocking boot path, so the paint win is the whole point. The refetch is one cheap non-blocking call, and it keeps a profile edited on another device from being wrong forever. |
| `['instagram','status']` | **persist + trust** | Its `staleTime` already encodes exactly when the answer can change (`nextAvailable`), so a revalidate before that date is a request that cannot learn anything. This is the epic's ask and the endpoint guarding a billed call. |
| `['catalog','mine']` | **do not persist** (initially) | See D4. |
| `['catalog',id,'items']` | **do not persist** (initially) | See R5 — the one that generates a support ticket. |

Net effect of the recommendation: **cold start goes from 4 blocking requests to 3
non-blocking ones, and the skeleton disappears.** If the team wants the request count
down instead, flip profile to "trust" — but make that choice deliberately.

---

## 4. Decisions to take

| # | Decision | Recommendation | Rationale |
|---|---|---|---|
| **D1** | Container | `localStorage` | Not cookies (sent on every API request, 4 KB budget, no upside). Not IndexedDB — async, and our payload is a few KB. |
| **D2** | Mechanism | `PersistQueryClientProvider` + `createSyncStoragePersister` | Maintained; restore/throttle/`maxAge` solved. `experimental_createPersister` (per-query) is finer-grained but still experimental and we do not need per-query granularity — the allowlist gives it. |
| **D3** | Cache version (`buster`) | **Auto-derive from the build**, via a `define` in `vite.config.ts` | See R1. A hand-maintained `CACHE_VERSION` const only works if every future author remembers to bump it when a cached type changes. Nobody will. Deriving it from the build makes the trap structurally impossible, at the cost of dropping the cache on each deploy — deploys are far rarer than sessions, so this is close to free. |
| **D4** | Allowlist | `['profile']`, `['instagram','status']` only | The two where a stale read is harmless. Catalog and items are held back deliberately — see R5. Revisit with §7 once this is proven in production. |
| **D5** | Dev stage | **Persistence off when `IS_DEV_STAGE`** | Not a preference — see R3, it is a concrete contradiction with the existing mocks. |
| **D6** | `maxAge` | 24 h | Long enough to cover any realistic gap between sessions; short enough that a forgotten device does not serve week-old data. |
| **D7** | Logout | Remove the persisted blob on **both** session-end paths | `logout` and `api.ts`'s 401 give-up. Phase 4 already showed these are easy to get subtly wrong. |
| **D8** | Multi-tab | Add a `storage` listener on the token key | See R2. Small, and it fixes a bug that already exists. |
| **D9** | PII on disk | **Team call — not mine** | See R4. Engineering can make it correct; whether seller business data should sit on a possibly shared device is a product/policy question. |

---

## 5. Risks, worst first

### R1 — Rehydrating a type that has since changed · *high severity, medium likelihood*

A `Profile` dehydrated by build N is rehydrated by build N+1 **with no validation**.
Add a required field and every consumer reading it gets `undefined`; the failure
surfaces as a runtime error on a user's device, on the boot path, with no way for
them to recover but clearing site data.

This is the single most dangerous thing about Phase 5, and it is invisible in
testing: local dev has no old blob, and staging is deployed with a fresh cache.

**Mitigation (D3):** derive `buster` from the build. Not a documented rule — a rule
would be obeyed for two months. Cost: the persisted cache is dropped on every deploy,
which is exactly the behaviour we want and almost never a user-visible one.

### R2 — The multi-tab logout hole · *high severity, low likelihood*

Tab A logs out: tokens cleared, memory cache cleared, blob removed. Tab B is still
mounted, still holding the previous user's rows in memory, and **re-persists them on
its next cache write** — resurrecting them on disk after a logout.

Note what is already true without persistence: tokens live in shared `localStorage`,
so tab B is *already* in a broken state after a logout in tab A — it renders as
authenticated with no tokens. Persistence does not create this bug; it upgrades it
from a transient UI inconsistency into data written back to disk.

**Mitigation (D8):** a `storage` event listener on `alk.token` that forces the other
tabs through `logout`. Worth doing on its own merits.

### R3 — Contradicting the dev-stage mocks · *medium severity, certain*

Verified, not hypothetical. `src/mocks/mockInstagramStore.ts:101,104` keeps
`enrolled` and `nextAvailable` as module-level `let`s that reset on reload — and
`CLAUDE.md` documents that reset as the way to replay the enrollment wizard.

Persist `/instagram/status` in dev and a reload restores `enrolled: true,
nextAvailable: <future>` over a store that says un-enrolled. The dev session is then
pinned to the cooldown screen with no way out but clearing site data, and the
documented "reload to start the wizard over" behaviour is gone.

**Mitigation (D5):** no persistence when `IS_DEV_STAGE`. Consequence to accept —
persistence is then never exercised by hand in dev, so §9's tests carry it.

### R4 — Seller data outliving the tab · *medium severity, certain*

On disk: alias, profile description, photo URL — and, if D4 is ever widened, catalog
text and item names and prices. No credentials, no payment data. But it survives the
tab on a device that may be shared or lost.

**Mitigation:** D7 removes it at logout. The residual question — whether this data
should be at rest at all — is **D9**, and it is not an engineering decision.

### R5 — A stale catalog is a support ticket · *medium severity, medium likelihood*

This is why D4 holds catalog and items back. With our defaults, a persisted item list
**never refetches**: `staleTime: Infinity` + `refetchOnMount: false` + restored
`dataUpdatedAt` means a product deleted on device B keeps rendering on device A
indefinitely. The seller's catalog is the surface buyers see, and *"I deleted that
and it is still there"* is a complaint with real cost.

Persisting them is still possible later, but only with a boot-time revalidate
attached (§7) — never by simply adding them to the allowlist.

### R6 — Restore flash undoing the paint win · *low severity, medium likelihood*

`PersistQueryClientProvider` restores through a promise even with synchronous
storage, so there is one tick where `useIsRestoring()` is true and queries have no
data. If `isBooting` is not taught about it, boot flashes the skeleton and lands on
the restored profile — which is the exact experience the phase exists to remove.

**Mitigation:** fold `useIsRestoring()` into `isBooting` in `AuthContext`, and assert
it (§9).

### R7 — Write amplification · *low severity*

Every cache change re-serialises the allowlisted cache and writes it (default throttle
1 s). With a profile and a status object that is a couple of KB — negligible.

It is, however, the reason the allowlist must stay closed. Adding Pedidos or chat
would push an accumulating, paginated feed through `JSON.stringify` on every page
load, against a ~5 MB quota.

---

## 6. What must never be persisted

Restating, because an allowlist erodes one well-meaning line at a time:

- **The public catalog, questions, Pedidos, chat, notifications.** Other people write
  those rows; their staleness is not ours to trade away, and Pedidos and chat are
  unbounded in size.
- **Anything derived from `mediaUrl`** on an Instagram post. Those CDN links expire —
  `CLAUDE.md` already forbids persisting them anywhere.
- **`/instagram/posts`.** The billed feed. Caching it in memory is already forbidden;
  on disk it would additionally make a stale feed importable.
- **Tokens.** They live in `alk.token` / `alk.refreshToken` and stay there.

---

## 7. If catalog + items are added later

Not part of this phase. The rule that must come with them:

Persisted catalog data paints immediately but is marked **stale**, so exactly **one**
background refetch runs per app cold start — never per navigation. Implement as a
one-shot invalidate of the two catalog keys on the persister's restore callback.
**Never by setting `refetchOnMount: true`**, which would undo Phase 3 entirely.

Net: 2 non-blocking requests per launch instead of 2 blocking ones per screen, with
an instant first paint. Ship §8 and measure before taking this.

---

## 8. Implementation sketch

Only after §4 is agreed.

```bash
npm i @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister
```

| File | Change |
|---|---|
| `vite.config.ts` | `define: { __CACHE_BUSTER__: JSON.stringify(Date.now().toString()) }` — a fresh value per build (D3). Use the git short sha instead if reproducible builds matter; note it needs `.git` present in CI. |
| `src/lib/queryPersist.ts` | new — the persister, the allowlist predicate, `clearPersistedCache()` |
| `src/router/AppRouter.tsx` | `PersistQueryClientProvider` in place of `QueryClientProvider`, skipped entirely when `IS_DEV_STAGE` (D5) |
| `src/sections/auth/AuthContext.tsx` | `logout` also calls `clearPersistedCache()`; `isBooting` folds in `useIsRestoring()` (R6); `storage` listener for cross-tab logout (D8) |
| `src/lib/queryClient.ts` | `resetAppCache()` also clears the blob, for `api.ts`'s 401 path (D7) |

Allowlist shape:

```ts
const PERSISTED: ReadonlyArray<readonly unknown[]> = [queryKeys.profile(), queryKeys.instagramStatus()]
// An allowlist, never "everything that succeeded". Adding a key here is a
// decision about staleness, not a performance tweak — see D4 / R5.
```

---

## 9. Testing

jsdom gives us a real `localStorage`, so all of this is testable. The tests must be
**mutation-checked** the way phases 3–4 were — a persistence test that passes
vacuously is worse than none.

| Test | Asserts |
|---|---|
| A reload serves the profile from disk | second mount with a pre-seeded blob: no `fetchProfile` **block**, page paints |
| The boot skeleton does not appear when a profile is restored | R6 |
| A changed buster discards the blob | R1 — seed a blob with an old buster, assert a fresh fetch |
| `maxAge` discards an old blob | D6 |
| Logout removes the blob | D7 — assert `localStorage` key is gone, not just that memory cleared |
| The 401 give-up path removes the blob | D7's second half |
| Only allowlisted keys are written | D4 — seed a catalog query, assert it is absent from the blob |
| Nothing is persisted in dev stage | D5 |
| A `storage` event clearing the token logs this tab out | D8 |

---

## 10. Definition of done

- [ ] Cold start with a warm blob renders the app with **no** boot skeleton.
- [ ] `/instagram/status` is not requested after a reload while a cooldown is
      running, and the date is on screen before any network call resolves.
- [ ] A deploy (new buster) discards the previous blob without a user-visible error.
- [ ] Logging out leaves **nothing** in `localStorage` under the cache key — verified
      in the browser, not only in a test.
- [ ] Logging out in one tab logs out the others.
- [ ] `npm run build`, `npm run lint`, `npm test` clean.
- [ ] `CLAUDE.md` carries the persistence rules and the closed allowlist.

---

## 11. Open questions for the team

1. **How often do users cold-start?** The whole phase is justified by that number and
   it is not in this repo. If it is rare, take Option C.
2. **D9 — is seller business data at rest on the device acceptable?** Policy, not
   engineering.
3. **Do reproducible builds matter?** It decides whether D3 uses a build timestamp or
   the git sha.
4. **Is the boot paint or the request count the goal?** §3 — they are separable, and
   the answer changes what `['profile']` does on boot.


---

## 12. What actually shipped

| File | Change |
|---|---|
| `vite.config.ts` / `vitest.config.ts` | `define: { __CACHE_BUSTER__ }` — a fresh value per build (D3); fixed to `'test'` under vitest |
| `src/vite-env.d.ts` | new — declares `__CACHE_BUSTER__` |
| `src/lib/queryStorage.ts` | new — `QUERY_STORAGE_KEY` + `clearPersistedCache()`, a leaf module so `queryClient` and `queryPersist` need not import each other |
| `src/lib/queryPersist.tsx` | new — the allowlist, `restoreFromDisk()`, `AppQueryProvider` |
| `src/lib/queryClient.ts` | `resetAppCache()` drops the blob too (D7, `api.ts` half) |
| `src/lib/auth.ts` | `TOKEN_KEY` exported for the cross-tab listener |
| `src/sections/auth/AuthContext.tsx` | `logout` drops the blob; `storage` listener ends the session cross-tab (D8) |
| `src/router/AppRouter.tsx` | `AppQueryProvider` replaces `QueryClientProvider` |
| `src/lib/__tests__/queryPersist*.test.tsx` | new — 10 tests |

### D2 was overturned: restore is hand-rolled, writes stay library-owned

The blueprint chose `PersistQueryClientProvider` (D2) and planned to fold
`useIsRestoring()` into `isBooting` to cover R6. **Implemented that way, the test
`never shows the booting state when a profile is restored` fails.**

`PersistQueryClientProvider` restores through a promise even over synchronous
storage. For that tick queries are paused, so the profile query reports
`isLoading: false` *with no data* — and `ProtectedRoute` reads exactly that as "not
authenticated". The library's provider therefore offers a choice between a full-page
skeleton on every cold start and a bounce to `/login`. Removing that skeleton is the
entire prize of the phase, so neither is acceptable.

Shipped instead: `restoreFromDisk()` reads and `hydrate()`s **synchronously** in a
`useState` initialiser, before children first render. The write half is still
`persistQueryClientSubscribe`, so throttling and dehydration stay library-owned.
What is hand-rolled is exactly the two guards — buster and `maxAge` — and both are
mutation-checked.

R6 is therefore closed by construction rather than by a gate, and the
`useIsRestoring()` line was removed as dead code.

### Two of the tests were vacuous on the first pass

Worth recording, because the failure mode is the one this whole epic is exposed to.

`discards the blob when the build changed` and `discards a blob older than maxAge`
originally asserted `fetchProfile` was called twice. **Both passed with the guard
deleted** — a discarded blob and an accepted-then-revalidated one each fetch exactly
once more, so a call count cannot tell them apart. They now put *different* data in
the tampered blob and assert the stale row is never rendered, which the synchronous
restore makes observable on the first tick.

### Mutation coverage

| Mutation | Fails |
|---|---|
| buster check removed | `discards the blob when the build changed` |
| `maxAge` check removed | `discards a blob older than maxAge` |
| `hydrate()` skipped | cold-start paint, no-booting-state |
| allowlist opened to all successful queries | `writes only allowlisted keys to disk` |
| dev-stage gate removed | `writes nothing to disk` (dev suite) |
| `clearPersistedCache()` dropped from `logout` | `removes the blob on logout` |

### The open questions, answered (2026-09-08)

**Q1 — how often do users cold-start? → Not often.** Alkachof is built to run light
on a phone, and the product does not expect frequent relaunches.

**Q2 / D9 — is seller data at rest acceptable? → Yes, not a concern for now.** A
phone is not a readily shared device, so a second user inheriting the first one's
rows is not a scenario worth designing against. `['profile']` stays in the
allowlist.

**What that means for this phase, stated plainly: Phase 5 is the least valuable of
the five.** Its entire return — both the saved requests and the boot paint —
is proportional to cold-start frequency, and the answer to Q1 is "low". It is
kept because it is already built, tested and inert, not because the numbers
argue for it. Nothing here is load-bearing for phases 1–4.

Two things that answer does *not* change:

- **The allowlist still stands on R5, not on R4.** Catalog and items are held back
  because a persisted list never refetches, so a product deleted on another *device*
  would render forever. That is a multi-device problem, not a shared-device one, and
  Q2's answer does not touch it. Do not widen the allowlist on the strength of
  "phones aren't shared".
- **"Cold start" is not the same as "the user relaunched the app."** Mobile
  operating systems evict backgrounded tabs and PWAs aggressively, so a seller who
  checks WhatsApp and comes back can get one without ever having closed anything.
  The real frequency may be higher than the product-level intuition suggests — worth
  a look in the metrics if this phase is ever reconsidered.

The session-boundary machinery (blob dropped on logout, on the 401 give-up path, and
on a cross-tab `storage` event) is kept regardless. It is already written, it is
tested, and it costs nothing at runtime.
