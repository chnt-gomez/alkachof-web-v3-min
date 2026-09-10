# Blueprint — Remove the dev-stage mocking mechanism

Implementation plan for retiring `src/mocks/`, `src/lib/stage.ts` and the
`VITE_DEV_STAGE` flag. Grounded in the current code: 67 mock files, 117
`IS_DEV_STAGE` occurrences across 56 source files, and ~19 markdown documents
that describe the mechanism.

**Nothing in this document is implemented yet.** It is the survey and the plan.

---

## 0. Reality check — the mocks are already switched off

Before sizing the work, the single most important fact about it:

```
.env.development:  VITE_DEV_STAGE=false      # since 0313aee
.env.production:   VITE_DEV_STAGE=false
.env.example:      VITE_DEV_STAGE=false
```

**Every environment already runs against the real API.** The flag has been
flipped back and forth four times in the repo's history (`d14a58f` off, `22983a5`
on, `0313aee` off) and has been off since the Instagram integration landed. So:

- No behaviour changes for any user or developer when this ships. This is a
  deletion of unreachable code, not a migration.
- The blast radius is confined to what the compiler and the test suite can see.
  If `tsc -b`, `eslint` and 407 tests are green, the work is done.
- Conversely, `CLAUDE.md:520` and `README.md:25` both currently claim dev stage
  is the **default** when running `npm run dev`. That is already false. Anyone
  onboarding today is reading instructions for a mode nobody runs — which is a
  reason to do this now rather than later.

The one caveat: because the branches are dead, they are also **untested against
the real API**. Any action whose real path has rotted since the mocks were
written will surface at runtime, not at compile time. §6 covers how we find out.

---

## 1. Scope at a glance

| Category | Files | Detail |
|---|---|---|
| Mock generators + stores | **67** | all of `src/mocks/`, 2,221 LOC |
| Actions with a guard | **50** | one `if (IS_DEV_STAGE) return mock…()` each, except 3 multi-guard files |
| Non-action guard sites | **4** | `queryPersist.tsx`, `liveSocket.ts`, `useRequests.ts`, `stage.ts` |
| Test files coupled to the flag | **2** | one to delete, one to simplify |
| Env vars | **3 files** | `VITE_DEV_STAGE` in `.env.development`, `.env.example`, `.env.production` |
| Docs | **3 live + 1 retired** | `CLAUDE.md`, `README.md`, `feature.developmentStage.md`; historical docs untouched |

**69 files deleted** (67 mocks + `src/lib/stage.ts` + one test file) and **54
source files edited** (50 actions + 4 judgment sites, one of which is the second
test file), plus 3 `.env` files and 3 documents.

### What makes this tractable

Three properties of the current code, all verified:

1. **Every mock is reached through the `@/mocks` barrel.** There is not one deep
   import (`from '@/mocks/mockFoo'`) anywhere in `src/`. Deleting the directory
   breaks exactly the 51 files that import the barrel, and the compiler names
   all of them.
2. **Every guarded action has a real implementation behind the guard.** Verified
   by checking all 50 for an `api()` call. No feature is mock-only, so nothing is
   orphaned by the deletion. The lone exception is a hook, not an action —
   `useRequests.ts`, see §4.3.
3. **No test imports `@/mocks`.** Tests build their own sample objects inline
   (`sampleNews`, `sampleCatalog`, `sampleItem` helpers per file) and `vi.mock`
   the action module, which replaces it before the guard is ever reached. The
   test suite is almost entirely indifferent to this work.

---

## 2. Decisions taken

Settled before writing this plan; recorded here because each one closes off an
alternative someone will otherwise re-propose.

| # | Decision | Consequence |
|---|---|---|
| 1 | **Delete `IS_DEV_STAGE`, `src/lib/stage.ts` and `VITE_DEV_STAGE` outright** | The flag's only meaning was "mocks on". Keeping it would leave a switch with no defined semantics, and the next author would invent one. Forces the 4 non-action sites to pick a real behaviour — §4.2–4.4. |
| 2 | **Nothing replaces it.** Dev runs against the real API at `localhost:3001` | Already the case. No MSW, no new dependency, no second fixture system. **Cost accepted: offline development is gone**, and a backend outage now blocks frontend work. §7 records this honestly rather than burying it. |
| 3 | **Delete all 67 mock files**, including the seeded stores | `mockRequestStore` (228 LOC), `mockTransactionStore` (191), `mockChatStore` (156) and `mockInstagramStore` (177) are not salvaged into test fixtures. Tests already build their own data; a `src/test/fixtures/` folder would become a second mock system under a friendlier name. |
| 4 | **`ordersArchive.ts` goes with them** | See §5 — this is the one deletion that loses something the codebase valued, and it needs a CLAUDE.md change, not just a file removal. |
| 5 | **Docs: rewrite `CLAUDE.md` + `README.md`, retire `feature.developmentStage.md` with a header** | Historical feature/blueprint docs (`feature.Cart.md`, `blueprint.ProductServiceType.md`, …) keep their mock references. They describe what was true when written and are not instructions to anyone. |

---

## 3. The mechanical majority — 50 actions

For 47 of the 50, the edit is identical and needs no judgment:

```ts
 import { api } from '@/lib/api'
-import { IS_DEV_STAGE } from '@/lib/stage'
-import { mockFetchTransactions } from '@/mocks'
 import type { … } from '../types'

 export async function fetchTransactions(p: Params): Promise<Result> {
-  if (IS_DEV_STAGE) return mockFetchTransactions(p)
-
   const search = new URLSearchParams({ role: p.role })
   …
 }
```

Three lines out, no other change. The function body below the guard is already
the production path.

### 3.1 Full inventory, by section

Every site is tagged. `guards` is the number of `if (IS_DEV_STAGE)` branches in
the file (not counting the import line).

**auth — 9 files, 9 guards**

| File | Mock removed |
|---|---|
| `actions/fetchProfile.ts` | `mockFetchProfile` |
| `actions/login.ts` | `mockLogin` |
| `actions/signup.ts` | `mockSignup` |
| `actions/updateProfile.ts` | `mockUpdateProfile` |
| `actions/uploadProfileImage.ts` | `mockUploadProfileImage` |
| `actions/requestRecovery.ts` | `mockRequestRecovery` |
| `actions/resetPassword.ts` | `mockResetPassword` |
| `actions/verifyPhone.ts` | `mockVerifyPhone` |
| `actions/resendPhoneCode.ts` | `mockResendPhoneCode` |

**catalog — 16 files, 16 guards**

| File | Mock removed |
|---|---|
| `actions/fetchCatalogItems.ts` | `mockFetchCatalogItems` |
| `actions/fetchItem.ts` | `mockFetchItem` |
| `actions/createItem.ts` | `mockCreateItem` |
| `actions/updateItem.ts` | `mockUpdateItem` |
| `actions/deleteItem.ts` | `mockDeleteItem` |
| `actions/updateCatalog.ts` | `mockUpdateCatalog` |
| `actions/uploadCatalogImage.ts` | `mockUploadCatalogImage` |
| `actions/deleteCatalogImage.ts` | `mockDeleteCatalogImage` |
| `actions/broadcastCatalog.ts` | `mockBroadcastCatalog` |
| `actions/createLocation.ts` | `mockCreateLocation` |
| `actions/updateLocation.ts` | `mockUpdateLocation` |
| `actions/fetchInstagramStatus.ts` | `mockFetchInstagramStatus` |
| `actions/searchInstagramProfiles.ts` | `mockSearchInstagramProfiles` |
| `actions/enrollInstagram.ts` | `mockEnrollInstagram` |
| `actions/fetchInstagramPosts.ts` | `mockFetchInstagramPosts` |
| `actions/importInstagramPosts.ts` | `mockImportInstagramPosts` |

**publicCatalog — 10 files, 10 guards**

| File | Mock removed |
|---|---|
| `actions/fetchPublicCatalog.ts` | `mockFetchPublicCatalog` |
| `actions/fetchCatalogItems.ts` | `mockFetchCatalogItems` |
| `actions/fetchCatalogQuestions.ts` | `mockFetchCatalogQuestions` |
| `actions/askQuestion.ts` | `mockAskQuestion` |
| `actions/answerQuestion.ts` | `mockAnswerQuestion` |
| `actions/fetchCatalogLocation.ts` | `mockFetchCatalogLocation` |
| `actions/fetchCatalogUpdated.ts` | `mockFetchCatalogUpdated` + `mockCatalogStampStore` |
| `actions/fetchUserSubscriptions.ts` | `mockFetchUserSubscriptions` |
| `actions/subscribe.ts` | `mockSubscribe` |
| `actions/unsubscribe.ts` | `mockUnsubscribe` |

**transactions — 5 action files, 5 guards** (+1 test, §4.4)

| File | Mock removed |
|---|---|
| `actions/fetchTransactions.ts` | `mockFetchTransactions` |
| `actions/fetchTransactionPurchases.ts` | `mockFetchTransactionPurchases` |
| `actions/fetchCatalogSummaries.ts` | `mockFetchCatalogSummaries` |
| `actions/fetchProfileSummaries.ts` | `mockFetchProfileSummaries` |
| `actions/updateTransactionStatus.ts` | `mockUpdateTransactionStatus` |

**requests — 3 action files, 3 guards** (+`useRequests.ts`, §4.3)

| File | Mock removed |
|---|---|
| `actions/fetchRequests.ts` | `mockFetchRequests` |
| `actions/createRequest.ts` | `mockCreateRequest` |
| `actions/updateRequestStatus.ts` | `mockUpdateRequestStatus` |

**Remaining sections — 7 files**

| File | Guards | Mock removed |
|---|---|---|
| `chat/actions/chatApi.ts` | **4** | `mockFetchRecentChats`, `mockFetchChatMessages`, `mockSendChatMessage`, `mockCreateChat` |
| `chat/actions/fetchUserSummaries.ts` | 1 | `mockFetchUserSummaries` |
| `notifications/actions/fetchNotifications.ts` | **4** | `mockFetchNotifications`, `mockMarkNotificationSeen`, `mockDeleteNotification` |
| `home/actions/fetchNews.ts` | 1 | `mockFetchNews` |
| `home/actions/fetchSavedCatalogs.ts` | 1 | `mockFetchSavedCatalogs` |
| `cart/actions/checkoutCart.ts` | 1 | `mockCheckoutCart` |
| `catalogs/actions/fetchMyCatalog.ts` | 1 | `mockFetchMyCatalog` |

---

## 4. The four sites that need a decision, not a deletion

These are the whole reason this is a blueprint and not a `sed` command.

### 4.1 `src/lib/stage.ts` — delete the file

```ts
export const IS_DEV_STAGE = import.meta.env.VITE_DEV_STAGE === 'true'
```

One line, one export, no other content. Deleted, along with `VITE_DEV_STAGE`
from all three `.env` files and the `.env.example` comment block that explains
it.

`src/lib/api.ts` and `src/lib/shareUrl.ts` read `VITE_API_BASE_URL` and
`VITE_PUBLIC_APP_URL` — **both stay untouched.** Only the stage flag goes.

### 4.2 `src/lib/queryPersist.tsx` — persistence becomes unconditional

Two guards today (`:184`, `:187`), both disabling cache persistence in dev stage.
The reason is recorded in a 12-line comment at `:174` and it is entirely about
mocks:

> the mocks keep their state in module-level variables that reset on reload —
> `mockInstagramStore` starts un-enrolled every time … A persisted
> `/instagram/status` would survive that reload and contradict the store.

**With no mock store to contradict, the reason evaporates.** After the change:

```ts
const [restored] = useState(() => restoreFromDisk())

useEffect(() => {
  const unsubscribe = persistQueryClientSubscribe({ … })
  …
}, [])
```

Persistence then behaves identically in dev and prod, which is what we want — it
is a load-bearing part of the boot path (`ProtectedRoute` reads the restored
profile synchronously) and running dev without it means dev never exercises it.

**Delete the `:174` comment block** rather than rewriting it; it documents a
constraint that no longer exists. The surrounding notes on `restoreFromDisk`
being synchronous, and on `__CACHE_BUSTER__`, stay — they are unrelated.

### 4.3 `src/sections/requests/hooks/useRequests.ts` — the only real behaviour change

The single site where the mock branch does something the real branch does not.
At `:91`:

```ts
// While requests are mocked, names come from the seeded store — the mocked
// items endpoint would invent an unrelated name for these ids.
if (IS_DEV_STAGE) {
  setServiceNames(…serviceNameFor(id)…)
  return
}

// N+1 against GET /item/{id} — the list endpoint does not carry the service
// name yet (asked for in blueprint §7).
await Promise.all(ids.map(async (id) => { … fetchItem(id) … }))
```

Deleting the branch leaves the N+1 `fetchItem` path for everyone. **This is
correct and is already what production does** — but note what it means: the dev
experience of the Pedidos page gets *slower*, one `GET /item/:id` per distinct
service in the list. That is not a regression introduced here; it is prod
behaviour becoming visible in dev, which is the point of the exercise.

`serviceNameFor` is the only non-`mock*` export of the barrel and dies with it.

> **Worth flagging separately:** the N+1 exists because `/request/all` does not
> carry the service name. That ask predates this work and is unaffected by it,
> but with the mock gone it is now the *only* code path, so it is felt on every
> Pedidos load rather than only in production.

### 4.4 The two test files

**`src/lib/__tests__/queryPersist.devStage.test.tsx` — delete (93 lines).**

The entire file exists to assert that persistence is *off* in dev stage. It does
this by `vi.mock('@/lib/stage', () => ({ IS_DEV_STAGE: true }))` — mocking a
module that will no longer exist. Both of its tests ("writes nothing to disk",
"ignores a blob that is already on disk") describe behaviour we are deliberately
removing. There is nothing to port: the sibling `queryPersist` tests already
cover the persistence path that remains.

**`src/sections/transactions/__tests__/ordersFeedActions.test.ts` — edit.**

Line 4–5:

```ts
// The dev stage short-circuits to mocks; these tests are about the real calls.
vi.mock('@/lib/stage', () => ({ IS_DEV_STAGE: false }))
```

Both lines go. The rest of the file — which asserts the real `api()` paths and
query strings — is unaffected and is exactly the kind of test that gets *more*
meaningful once the guard is gone.

### 4.5 `src/sections/notifications/liveSocket.ts` — the socket always connects

One guard at `:29`: `if (IS_DEV_STAGE) return () => {}`. Removing it means the
dev client attempts a Socket.IO connection to `${API_BASE_URL}/live` on login.

Against a running local API this is right, and it means live notifications and
chat are finally exercised in dev. Against **no** API it is a connection error
in the console on a retry loop — noisy but not fatal, since the whole design is
best-effort (`connect_error` is already handled and REST remains the source of
truth).

Decision 2 accepts that noise: there is no offline mode any more, so a developer
with no backend has a broken app regardless of this socket. Update the function's
doc comment, which currently ends *"In dev stage there is no server, so this is a
no-op"*.

---

## 5. The one thing genuinely lost: `ordersArchive.ts`

`src/mocks/ordersArchive.ts` (35 LOC) is not a fixture. It is a **hand-maintained
mirror of the API's `api/util/orderFeedQuery.js`** — the rule deciding which
orders are archived out of the active feed — and CLAUDE.md asks twice that the
two be kept in step, the same arrangement as `imagePresets.ts` and
`catalogLimits.ts`:

> The one exception is `src/mocks/ordersArchive.ts`, which mirrors
> `api/util/orderFeedQuery.js` so the dev stage behaves like production; **keep
> the two in step**.

Its only consumers are `mockFetchTransactions.ts` and `mockFetchRequests.ts`, so
it cannot survive the deletion in place. Per decision 3 it is deleted rather than
relocated.

**What this costs, stated plainly:** the client loses its written-down copy of
the archive rule. The rule itself is server-owned and the client never applied it
(CLAUDE.md is emphatic about that), so no behaviour changes — but a future reader
asking "what counts as archived?" now has to read the API repo instead of a file
here.

**Required follow-through:** `CLAUDE.md:330` must lose the "one exception" clause
and the keep-in-step instruction, or it becomes an instruction to maintain a
deleted file. The surrounding paragraph — *the client never applies the archive
rule itself, the server owns it* — is unaffected and stays. `imagePresets.ts` and
`catalogLimits.ts` are **not** in `src/mocks/` and are untouched by any of this.

---

## 6. Execution — four commits

Ordered so the tree compiles at every step except deliberately inside step 2.

**Step 1 — the mechanical 50.** Strip the guard and the two imports from every
action in §3.1. Nothing else. `tsc -b` stays green throughout, because
`src/mocks/` still exists; the barrel simply loses its callers.

**Step 2 — the four judgment sites + the deletion.** §4.1–4.5 together with
`rm -r src/mocks` and `rm src/lib/stage.ts`. These belong in one commit because
the tree does not compile between deleting the barrel and fixing `useRequests`.

**Step 3 — env and docs.** §7.

**Step 4 — verify.** §8.

An alternative shape — one commit per section — was considered and rejected: the
edits are identical and reviewing 50 three-line diffs eleven times is worse than
reviewing them once.

---

## 7. Documentation

### 7.1 `CLAUDE.md` — five edits

| Line | Current claim | Action |
|---|---|---|
| **518–551** | The whole `### Development stage` section: mock structure, the 7 rules for every new action, the two-line guard example | **Delete the section.** Replace with a short `### Environment` note: dev reads `.env.development` and points at a real `localhost:3001`; there is no mock layer, and adding a new action means writing the `api()` call and nothing else. |
| **104–105** | "`IS_DEV_STAGE` still branches inside the action … a query needs no new mock file" | Delete the bullet. It answered "do queries need mocks?" — a question that no longer exists. |
| **184–186** | "Persistence is off in dev stage … would contradict `mockInstagramStore`" | Delete the bullet (§4.2). |
| **231–232** | "In dev stage `mockCatalogStampStore` mirrors the server's stamp…" | Delete the bullet. The freshness gate is now exercised against the real `GET /updated/:id`. |
| **330** | "The one exception is `src/mocks/ordersArchive.ts` … keep the two in step" | Rewrite per §5. |
| **469–471** | "In dev stage `mockInstagramStore` starts un-enrolled … type `la_tienda_de_ana`" | Delete the paragraph, including the mock handles for the happy and private-account paths. Replace with nothing: testing enrollment now needs a real un-enrolled account. |
| **320** | "(all mocked in dev stage per the mock rules)" | Drop the parenthetical. |
| **261** | Testing strategy: "Mock action modules with `vi.mock`" | **Leave alone.** This is about Vitest, not the dev stage, and is unaffected. |

The **Testing** section's rule 7 ("Tests are not affected … never change tests to
accommodate mock files") disappears with the Development stage section.

### 7.2 `README.md`

- Environment table (`:25`): delete the `VITE_DEV_STAGE` row.
- The paragraph below it (*"`VITE_DEV_STAGE=true` is the local default so you can
  run the UI without the backend"*) — delete. Replace with a line saying the dev
  server needs a reachable API and pointing at the `alkachof-api` repo.
- **Seeded data** section: keep, but drop the `(VITE_DEV_STAGE=false)` qualifier —
  it is now the only mode. *(Note: it lists password `admin` while `CLAUDE.md`
  lists `password`. Out of scope, but someone should reconcile them.)*

### 7.3 `feature.developmentStage.md`

Retire with a header, do not delete:

```markdown
> **Superseded — 2026-09-09.** The dev-stage mock layer described here was
> removed; see `blueprint.RemoveDevStageMocks.md`. Kept as a record of how the
> client worked before it ran against a real API.
```

### 7.4 Historical docs — untouched

`blueprint.ProductServiceType.md`, `feature.Cart.md`, `epic.AlkachofRoadmap2026.md`,
`followup.CatalogImageApi.md`, `blueprint.InvitationPage.md`,
`feature.EditCatalogView.md`, `blueprint.LocalCaching.md`,
`followup.LocalCacheApi.md`, `blueprint.BuyerCompletion.md`,
`blueprint.CachePersistence.md`, `followup.PhoneValidationApi.md`,
`followup.OrdersFeedPagination.md`, `BACKEND_REFACTOR_GUIDE.md` and the rest all
mention mocks. They are dated records of decisions, not standing instructions,
and rewriting them would falsify the history. `CLAUDE.md` is the file that steers
new work, and it will be correct.

---

## 8. Verification

Compiler-first, because that is what makes this safe:

1. **`npx tsc --noEmit`** — the primary gate. Every missed import of a deleted
   module is a type error naming the file. If this is clean, no code path
   references the mocks.
2. **`npm run lint`** — catches unused imports left behind by a partial edit.
   Baseline is 0 errors / 7 pre-existing `react-refresh` warnings.
3. **`npx vitest run`** — baseline 407 tests / 37 files. Expected after: **405
   tests / 36 files**, the two lost being `queryPersist.devStage.test.tsx`.
   *Any other change in the count is a bug in the migration.*
4. **`grep -r "IS_DEV_STAGE\|@/mocks\|VITE_DEV_STAGE" src/ *.md`** — expected
   hits only in retired/historical docs and this blueprint.
5. **`npm run build`** — confirms the production bundle is unaffected.

### 8.1 The manual pass the compiler cannot do

Because the guards were dead, the real paths behind them are **unverified against
the current API**. `tsc` proves the code compiles, not that the endpoint answers.
Before merging, click through each section against a running `alkachof-api`:
login/signup, catalog editor CRUD, image upload, public catalog + questions +
subscription, cart checkout, Pedidos both scopes, chat, notifications (including
the live socket now that §4.5 lets it connect), and the Instagram wizard.

Bugs found here are **pre-existing**, not caused by the deletion. They should be
fixed on their own branch — folding them into this one would make a mechanical,
reviewable diff into a debugging session.

---

## 9. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A real action path has rotted while hidden behind a dead guard | Medium | §8.1's manual pass; fix separately from this branch |
| Offline development is gone for good | Certain — accepted | Decision 2. If the team misses it, MSW at the network layer is the shape of the answer; it would need its own blueprint |
| Console noise from the live socket with no API running | High, cosmetic | §4.5. The app is already unusable without an API |
| Someone re-adds a mock out of habit, following a stale doc | Low after §7 | The Development-stage section and its 7 rules are the thing being deleted |
| Dev is now slower on Pedidos (N+1 service names) | Certain — accepted | §4.3. Prod behaviour becoming visible, not a new regression |

---

## 10. Checklist — done 2026-09-09

- [x] Step 1 — stripped 56 guards + imports from the 50 actions in §3.1
- [x] Step 2 — §4.1 `stage.ts`, §4.2 `queryPersist.tsx`, §4.3 `useRequests.ts`, §4.4 tests, §4.5 `liveSocket.ts`, then `rm -r src/mocks`
- [x] Step 3 — `VITE_DEV_STAGE` out of `.env.development`, `.env.example`, `.env.production`
- [x] Step 3 — `CLAUDE.md`, `README.md`, retired `feature.developmentStage.md`
- [x] Step 4 — `tsc --noEmit` clean, lint 0 errors / 7 pre-existing warnings, **405 tests / 36 files**, `npm run build` succeeds
- [x] Step 4 — no `IS_DEV_STAGE` / `@/mocks` / `VITE_DEV_STAGE` anywhere in `src/`
- [ ] Manual pass against a running `alkachof-api` (§8.1) — **still owed**; file any breakage as separate bugs

### What the plan missed

Two things surfaced during execution that §3 and §7.1 did not tag:

1. **Two stale prose comments** in `chat/actions/fetchUserSummaries.ts` and
   `transactions/actions/fetchProfileSummaries.ts` described a "dev stage returns
   seeded names" branch in their JSDoc. The guard-line survey did not catch them
   because they are prose, not code. Both rewritten.
2. **`CLAUDE.md`'s notifications section** carried its own dev-stage sentence
   (*"In dev stage the socket is a no-op … `liveSocket.ts` guards on
   `IS_DEV_STAGE` itself"*) that §7.1's table did not list. Rewritten to match
   §4.5.

Both are the same lesson: a grep for the flag finds the branches, not the
sentences describing them. The final sweep (§8.4) is what caught them.

### Deliberately left alone

`epic.AlkachofRoadmap2026.md:86` still says **"Every new action ships with a
paired mock"** — a standing instruction, not a historical note, in a live epic.
It defers to "the rules in `CLAUDE.md`", and those rules are now correct, so it
misleads only a reader who stops at that line. Left per decision 5 (historical
docs untouched); worth a one-line fix if the roadmap is edited for any other
reason.
