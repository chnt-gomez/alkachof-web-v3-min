### Roadmap for Alkachof 2026.

Alkachof is a SOLOMO e-commerce application. It allows very small enterpreneurs to have a space on internet to simply publish goods, crafts, services, second-hand goods and other similar products. The core behind alkachof is to provide the owners of the business a sandbox to do whatever they want.

## Concepts
# Catalog: 
The catalog is the foundation of Alkachof. It's the virtual space of any registered user. It's unique and allows the owner to submit products and services which are available for any user to browse. Each catalog can be configured depending on the owner circumstances:
 - Payment type: (Accepted types)
 - Shipment options: (Available options)
 - Geolocation (Important for future epics)
 - Basic information about the catalog

# Product:
The items belogning to each catalog. The items are described by the owner with a picure. The item can be uploaded blank, with no additional properties but the picture.

# Transaction:
When a user buys a product from a catalog, it creates a transaction. The transaction is the entry point of what will happen after the purchase. It tracks status, paid amount, units sold and such metadata for the owner.

# Subsciption:
Any user can subscribe to a catalog to receive notifications about changes in the catalog. Similar to a 'Subscribe' button, it saves the catalog for future browsing. 

## Basic Navigation


## Epics:
The front end needs several changes in order to be pre-production ready. We will use this document to start creating Epics along with an AI agent.

1. Navigation menu. The whole UI needs to be contained within a navigation menu.
2. Login Screens. We need all authentication related screens: Create account, Login, Forgot Password.
3. Private Catalog View. To allow an identified user to make changes in the catalog
4. Private Product Vierw. To allow an identified user to make changes in a specific product
5. Home / Dashboard screen. This will show sales and subscriptions. SHould be the first screen after an identified users logs
6. Browse Catalogs. This will show near catalogs along with a search bar.Best suited for unidentified catalogs
7. Profile View
8. App Settings View
9. Public Catalog View. Shows all published products. Allows both identified and unidentified users to browse the collection.

## Pending Epics.
 - Unidentified

---

## Live status

- ✅ **Week 1 — Nav shell + auth** — shipped on branch `ALK-1-W1` (commit `e6aab8d`). See the Week 1 section for what landed and the parked follow-ups.
- ✅ **Week 2 — Private Catalog (list + create)** — shipped on branch `ALK-3-W2`. See the Week 2 section.
- ✅ **Week 3 — Private Catalog (edit metadata + item list)** — shipped on branch `ALK-3-W3`. See the Week 3 section.
- ✅ **Week 4 — Private Product CRUD** — shipped on branch `ALK-4-W4`. See the Week 4 section.
- ⏳ Weeks 5–8 — not started.

A consolidated punch list of every parked follow-up lives in the **"Carry-over backlog"** section below the weekly plans. Treat that section as the canonical list of work that must close before MVP ships to production.

## Planning inputs (locked in)

- **MVP scope (must ship):** auth (sign-up, login, recovery), private catalog view (CRUD), private product view (CRUD), image upload, public catalog view wired to the API.
- **Post-MVP (parked):** home/dashboard, browse catalogs + search, profile view, app settings, subscriptions, transactions, broadcasts, notifications, sales/purchase dashboards, payments, WhatsApp order flow, multi-catalog per seller.
- **Backend:** exists. OpenAPI at `http://localhost:3001/api-docs/` (title `Alkachof API` v1.0.0). Bearer JWT (`securitySchemes.bearerAuth`).
- **Auth model:** JWT stored in `localStorage`, attached as `Authorization: Bearer <token>`. `/refresh` available for renewal.
- **UI:** barebones shadcn primitives only. Theme + palette + design rules deferred to a post-MVP epic.
- **Release shape:** vertical slices — each week ends with one usable end-to-end feature, demoable on its own branch.
- **Branch strategy (mandatory for the agent):**
  - Always `git fetch` and branch from `dev` (a.k.a. `develop`).
  - Branch name pattern: `ALK-{EPICID}-{WEEK}` (e.g. `ALK-1-W1`, `ALK-3-W3`). `EPICID` references the numbered epic list above.
  - The agent is **only allowed to push to that branch**. Never push to `dev`, `develop`, or `main`.
  - The agent **does not open merge requests**. CI/CD will create the MR into `develop` from the branch.
- **Epic format:** goal → user stories → acceptance criteria → API endpoints → task checklist.
- **Language:** user-visible text in Spanish (es-MX); identifiers, comments, tests in English.

To confirm (flagged for redline):

- "Done" per week assumed as **PR merged to `main`, demoable**, no deploy gate. Adjust if there's a staging or prod cadence.
- Sequencing assumed as **Nav shell → Auth → Private Catalog → Private Product → Images → Public Catalog → Recovery → Hardening**, honoring the order of the numbered epics above. Browse, Home/Dashboard, Profile, Settings parked post-MVP.

---

## Cross-cutting foundations (folded into Week 1)

These pieces ship inside Week 1 but are listed once for visibility:

- `src/lib/api.ts` — fetch wrapper: base URL, `Authorization` header injection, JSON parsing, error normalization, 401 → `/refresh` retry once.
- `src/lib/auth.ts` — token read/write/clear against `localStorage`. Single source of truth.
- `VITE_API_BASE_URL` env var; `.env.development` points at `http://localhost:3001`.
- `IS_DEV_STAGE` continues to gate mocks per `src/lib/stage.ts`. **Every new action ships with a paired mock** under `src/mocks/`, per the rules in `CLAUDE.md`.

---

## Mapping: user's epic list → weekly slices

| # | User's epic | MVP? | Weekly slice |
|---|-------------|------|--------------|
| 1 | Navigation menu | ✅ | Week 1 (with auth shell) |
| 2 | Login screens | ✅ | Week 1 + Week 7 (recovery) |
| 3 | Private Catalog View | ✅ | Weeks 2–3 |
| 4 | Private Product View | ✅ | Week 4 |
| 5 | Home / Dashboard | ⏳ post-MVP | — |
| 6 | Browse Catalogs | ⏳ post-MVP | — |
| 7 | Profile View | ⏳ post-MVP | — (image upload reuses partial profile work in Week 5) |
| 8 | App Settings View | ⏳ post-MVP | — |
| 9 | Public Catalog View | ✅ | Week 6 |

Image upload is implicit in epics 4 and 7 — broken out as Week 5 because it carries integration risk worth isolating.

---

## Week 1 — Navigation shell + auth (sign-up + login) ✅ SHIPPED on `ALK-1-W1`

**Goal:** the whole app lives inside a persistent navigation shell. A new visitor can register, log in, and land on the shell. JWT persists across refreshes.

**User stories**

- As any user, every screen renders inside a shared navigation menu.
- As a new seller, I can sign up with email + password.
- As a returning seller, I can log in.
- As a logged-in seller, refreshing the page keeps me logged in.
- As a logged-in seller, I can log out and my token is cleared.

**Acceptance criteria — status**

- ✅ A `<NavShell>` wraps private routes (`/`, `/product/:id`, `/edit/catalog/:catalogId`); shows app title and auth-aware menu.
- ✅ `/login` and `/signup` render shadcn forms with Spanish validation messages.
- ✅ `POST /login` stores `token` + `refreshToken` in `localStorage` under `alk.token` / `alk.refreshToken` and redirects to the page the user came from (or `/`).
- ⚠️ `POST /signup` does **not** auto-login — the backend returns no token and the user starts with `status: 'pending-registration'`. The UI ends signup on a "Revisa tu correo" screen with a button to `/login`. Acceptance updated to match reality.
- ✅ `ProtectedRoute` redirects unauthenticated users to `/login` with `state.from` so they bounce back after login.
- ✅ `AuthContext` exposes `profile`, `isAuthenticated`, `isBooting`, `login`, `signup`, `logout`.
- ✅ Failed login surfaces a Spanish inline error ("Correo o contraseña incorrectos"). No field-level enumeration.

**API**

- `POST /signup` → `{ message, user }` (no token — see note above)
- `POST /login` → `{ token, refreshToken }`
- `POST /refresh` → `{ token, refreshToken }` (used on 401 retry)
- `GET /profile` → `{ profile }` (called on boot if a token exists, and right after a successful login)

**Token handling (as implemented)**

- Login response → `AuthContext.login` → `setTokens(token, refreshToken)` writes both keys to `localStorage` → immediately calls `GET /profile` to populate the user.
- Every authenticated request goes through `api()` in `src/lib/api.ts`, which attaches `Authorization: Bearer ${token}`.
- On a `401`, `api()` calls `POST /refresh` with the refresh token once, stores the new pair, retries the original request. If `/refresh` fails, both tokens are cleared and `ApiError('Sesión expirada', 401)` is thrown.
- On boot, `AuthContext` checks for a token; if present it calls `GET /profile`. Profile failure clears tokens.
- Logout clears both keys and the in-memory profile.

**Tasks — status**

- [x] `src/lib/api.ts` fetch wrapper with auth header + 401-refresh-retry
- [x] `src/lib/auth.ts` localStorage helpers (`getToken`, `getRefreshToken`, `setTokens`, `clearTokens`)
- [x] `src/components/NavShell.tsx` (barebones shadcn)
- [x] `src/sections/auth/` with `LoginPage`, `SignupPage`, `AuthContext`, `useAuth`, `types.ts`
- [x] `actions/login.ts`, `actions/signup.ts`, `actions/fetchProfile.ts` (+ mocks)
- [x] `ProtectedRoute` in `src/router/`
- [x] Wire `/login`, `/signup` into `AppRouter.tsx`; guard private routes
- [x] Page-level tests: login happy + error + empty fields, signup happy + error + mismatched/short password (33/33 green)
- [x] `VITE_API_BASE_URL` added to `.env.development`
- [x] `src/components/ui/input.tsx` and `src/components/ui/label.tsx` added (shadcn-style primitives)

**Pending / follow-ups parked for later weeks (do not lose track):**

- [ ] **Email verification landing page** — backend issues a verification email after signup. We need `/verify/:token` calling `GET /validate/{token}` to activate the account. Currently the user has no in-app way to complete verification. **Owner: Week 7 (folded into recovery epic).**
- [ ] **Proactive token refresh** — we only refresh on 401 today, so the first request after expiry pays a one-hop penalty. A timer-based refresh (or decoding `exp` from the JWT) would smooth this. **Owner: Week 8 hardening.**
- [ ] **Token storage hardening** — `localStorage` is XSS-readable. Revisit once the backend can issue HTTP-only cookies, or evaluate `sessionStorage` + "remember me". **Owner: post-MVP security review (not in MVP, but tracked here).**
- [ ] **Logout server-side** — the backend currently has no `/logout` endpoint to invalidate the refresh token. Tokens stay valid until expiry. Flag for backend if this becomes a compliance concern. **Owner: backend coordination, post-MVP.**
- [ ] **Inactivity / session timeout** — no client-side idle timeout. Acceptable for MVP. **Owner: post-MVP.**
- [ ] **Toast system** — login/signup errors render as inline `role="alert"` text. A shared `useToast` hook will land in Week 8 hardening; revisit auth pages to use it then.
- [ ] **Refresh-token race** — concurrent 401s could trigger multiple `/refresh` calls. Acceptable now (idempotent on the backend, last-write-wins on localStorage). If we hit a bug, gate with an in-flight promise. **Owner: hardening if it surfaces.**
- [ ] **`fast-refresh/only-export-components` warning** in `AuthContext.tsx` (matches the same warning in existing context files). Cosmetic; either split `useAuth` out or accept the pattern repo-wide. **Owner: hardening.**
- [ ] **`GET /profile` boot race** — if the boot fetch is slow, `ProtectedRoute` shows "Cargando..." with no skeleton. Replace with proper skeleton in Week 8.

---

## Week 2 — Private Catalog View (list + create) ✅ SHIPPED on `ALK-3-W2`

**Goal:** a logged-in seller sees their catalog and can configure its basics.

**User stories**

- As a seller, I see my catalog when I open the app.
- As a seller without a catalog yet, I can create one with title, description, payment types, and shipment options.
- As a seller, tapping my catalog opens its detail view.

**Acceptance criteria — status**

- ✅ Logged-in home (`/`) renders `CatalogsPage` — the seller's catalogs as shadcn cards, or an empty-state CTA when there are none.
- ✅ "Nuevo catálogo" opens a hand-rolled modal (matches the in-repo pattern from `AddProductModal`; shadcn `Dialog` primitive deferred — see follow-up below) with a validated form. Success closes and prepends the new catalog to the list.
- ✅ Loading skeleton during fetch (`aria-busy`); error state surfaces a Spanish message with a "Reintentar" button.
- ✅ Empty state in Spanish: "Aún no tienes catálogos" + "Crear mi primer catálogo" CTA.
- ✅ Tapping a catalog card navigates to `/edit/catalog/:catalogId` (the existing Week 3 edit shell).

**API**

- `GET /catalog` → `{ catalogs }` (list of catalogs owned by current user)
- `POST /catalog/new` → `{ catalog }` (created catalog)
- `GET /catalog/{catalogId}` → `{ catalog }` (catalog metadata, used by the edit flow)

**Tasks — status**

- [x] `actions/fetchMyCatalogs.ts`, `actions/createCatalog.ts`, `actions/fetchCatalog.ts` under `src/sections/catalogs/actions/`
- [x] Paired mocks under `src/mocks/`: `mockFetchMyCatalogs`, `mockCreateCatalog`, `mockFetchCatalog` (shared in-memory cache so a freshly created catalog appears in subsequent fetches in dev stage)
- [x] `src/sections/catalogs/CatalogsPage.tsx` (loading skeleton, error+retry, empty state, list render, create dialog mount)
- [x] `NewCatalogDialog` component with validated form (alias, description, pay options, delivery types) and Spanish errors
- [x] `CatalogCard` component links to `/edit/catalog/:catalogId`
- [x] `HomePage` now renders `CatalogsPage` (the previous landing card is gone; `/` is the seller's catalogs index)
- [x] Page-level tests: empty state, list render, create flow happy path, error+retry, validation rejection (5 new, 38/38 green total)
- [x] `vite build` passes; `npm run lint` clean (only the 4 pre-existing `react-refresh/only-export-components` warnings)

**Pending / follow-ups parked for later weeks:**

- [ ] **Replace hand-rolled `NewCatalogDialog` overlay with a shared shadcn `Dialog` primitive** — `AddProductModal`, `EditCatalogModal`, and `NewCatalogDialog` all hand-roll the same overlay shell. **Owner: Week 8 hardening.**
- [ ] **Per-card thumbnail / cover image** — `CatalogCard` shows alias + description + location only. Once the catalog model exposes a cover image (post-Week 5 image upload), surface it here. **Owner: post-W5 polish.**
- [ ] **Optimistic create** — `createCatalog` waits for the round-trip before adding to the list. Acceptable for MVP; revisit if latency hurts. **Owner: post-MVP polish.**
- [ ] **`fetchCatalog` action duplicates `fetchEditableCatalog`** — the existing edit shell still uses `fetchEditableCatalog` (which bypasses the `api()` wrapper and uses `credentials: 'include'`). Week 3 should migrate the edit shell onto `fetchCatalog` via `api()` so we get auth + 401-refresh handling there too. **Owner: Week 3.**

---

## Week 3 — Private Catalog View (edit metadata + item list) ✅ SHIPPED on `ALK-3-W3`

**Goal:** a seller can rename and configure their catalog and see its products.

**User stories**

- As a seller, I can edit my catalog's title, description, payment types, and shipment options.
- As a seller, I see all products inside my catalog.
- As a seller, I can navigate to a product's private detail view.

**Acceptance criteria — status**

- ✅ Catalog detail page exposes editable metadata behind an "Editar" affordance (pencil button → `EditCatalogModal`).
- ✅ `POST /catalog/{id}/update` is called on save via the `api()` wrapper; UI updates optimistically and rolls back on error (rollback test added).
- ✅ Products render in the `columns-2` masonry per the golden rules (no `object-cover`, no fixed image heights). Already in place from prior work — verified by the existing image-class assertion test.
- ✅ Empty-products state in Spanish ("Aún no tienes productos en este catálogo") with CTA "Agregar primer producto".

**API**

- `POST /catalog/{catalogId}/update`
- `GET /catalog/{catalogId}/items`
- `GET /item/{itemId}`

**Tasks — status**

- [x] `actions/updateCatalog.ts` migrated to `api()` + `POST /catalog/{id}/update`
- [x] `actions/fetchCatalogItems.ts` and `actions/fetchItem.ts` added under `src/sections/catalog/actions/` (use `api()` for auth + 401-refresh) + paired mocks (`mockFetchItem`, reuses `mockFetchCatalogItems`)
- [x] `EditCatalogContext` migrated off `fetchEditableCatalog` onto `fetchCatalog` via `api()` (closes carry-over **C10**). `fetchEditableCatalog.ts` removed.
- [x] `EditCatalogModal` surfaces save errors via `role="alert"`; optimistic update + rollback in the provider's `updateCatalog`.
- [x] `ProductPage` now fetches by id (`GET /item/{itemId}`) and renders name, description, image (golden rules), price (es-MX), stock.
- [x] Tests: edit happy path, optimistic rollback on error, empty-state CTA, plus the previously-existing item-list render tests. 41/41 green.
- [x] `vite build` passes; `npm run lint` clean (only the 4 pre-existing `react-refresh/only-export-components` warnings).

**Pending / follow-ups parked for later weeks:**

- [ ] **`EditCatalogModal` and `AddProductModal` still hand-roll the overlay shell.** Rolling them onto a shared shadcn `Dialog` primitive is tracked as carry-over **C9**. **Owner: Week 8 hardening.**
- [ ] **`mockFetchEditableCatalog.ts` is now only used by `mockFetchCatalog`** — collapse the two into one mock generator during Week 8 cleanup, or leave as-is if backend coordination splits the two reads. **Owner: Week 8.**
- [ ] **No back-link from `ProductPage` to public catalog view.** Today it links to `/edit/catalog/:catalogId`; revisit once the buyer-side product view ships (post-MVP).

---

## Week 4 — Private Product View (CRUD) ✅ SHIPPED on `ALK-4-W4`

**Goal:** a seller can add, edit, and delete products in their catalog. Blank products (picture only) are valid per the concept definition.

**User stories**

- As a seller, I can add a product with at least a picture; title/description/price/stock are optional.
- As a seller, I can edit any existing product.
- As a seller, I can delete a product with a confirmation step.

**Acceptance criteria — status**

- ✅ "Agregar producto" opens `ItemFormDialog` with validated form (price ≥ 0 and stock ≥ 0 when present; image required for create).
- ✅ Edit reuses the same dialog, pre-filled with the item's current values.
- ✅ Delete shows `DeleteItemConfirm` (`role="alertdialog"`, copy "¿Eliminar producto?"). Cannot be undone.
- ✅ Prices formatted via `(cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })`.
- ✅ A product with only an image (no name/price/stock) renders cleanly: card shows "Producto sin nombre" fallback, hides the price row, and the page hides the price line entirely when `price === 0`.

**API (wired through `api()` for auth + 401-refresh)**

- `POST /catalog/{catalogId}/item/add`
- `POST /item/{itemId}/update`
- `POST /item/{itemId}/delete`

**Tasks — status**

- [x] `actions/createItem.ts`, `actions/updateItem.ts`, `actions/deleteItem.ts` migrated/added; all route through the `api()` wrapper. Paired mocks: `mockCreateItem`, `mockUpdateItem`, `mockDeleteItem`.
- [x] `ItemFormDialog` shared create/edit component (`mode: 'create' | 'edit'`, `onSubmit` callback). Replaces `AddProductModal` + `EditProductModal` (both deleted).
- [x] `DeleteItemConfirm` confirmation dialog with Spanish copy and inline error rendering.
- [x] `EditCatalogContext` extended with `deleteItem`. `ProductGrid` exposes per-card delete affordance. `ProductPage` adds "Editar" + "Eliminar" CTAs; delete navigates back to `/edit/catalog/:catalogId`.
- [x] Tests: create flow, update flow, delete flow, cancel-delete, blank-product render, negative-price validation (6 new, 47/47 green).
- [x] `vite build` passes; `npm run lint` clean (only the 4 pre-existing `react-refresh/only-export-components` warnings).

**Pending / follow-ups parked for later weeks:**

- [ ] **Real image upload** — `ImagePickerSheet` still uses `URL.createObjectURL`, so picked images don't survive a refresh. Replaced when Week 5 lands.
- [ ] **Shared shadcn `Dialog` primitive** — `ItemFormDialog` and `DeleteItemConfirm` still hand-roll the overlay (now folded into carry-over **C9**). **Owner: Week 8 hardening.**
- [ ] **Optimistic delete** — currently waits for the round-trip. Acceptable for MVP.

---

## Week 5 — Image upload

**Goal:** sellers upload real product images; uploaded URLs render across the app.

**User stories**

- As a seller, I can upload an image when creating or editing a product.
- As a seller (lightweight profile), I can upload a profile picture.
- Images respect the golden rules (`object-contain`, `w-full`, no fixed heights).

**Acceptance criteria**

- File picker accepts JPG/PNG/WebP, ≤ 5 MB; client-side validation with Spanish errors.
- Upload shows progress state; success replaces the placeholder.
- Failures retain the previous image and surface a Spanish toast.
- Mock returns a stable placeholder URL in dev stage.

**API**

- `POST /profile/{profileId}/image` (multipart)
- Item image upload path: **confirm during the week** — either a dedicated endpoint or pass an uploaded URL into `POST /item/{itemId}/update`.

**Tasks**

- [ ] `actions/uploadProfileImage.ts` (+ mock)
- [ ] `actions/uploadItemImage.ts` (+ mock) — clarify endpoint shape with backend
- [ ] `ImageUploadField` shadcn-styled component
- [ ] Wire into `ItemFormDialog` and a minimal profile-image control
- [ ] Tests: validation, success, failure

**Risks**

- Item image endpoint not explicit in the OpenAPI surface — confirm before kickoff.

---

## Week 6 — Public Catalog View wired to the API

**Goal:** `/public/catalog/:catalogId` reads from the real backend; the existing UI (`CatalogJumbotron`, `CatalogItemList`, `ProductDetailDialog`) keeps working unchanged.

**User stories**

- As any user (identified or not), I open a shared link and see a live catalog with real products and images.
- As any user, I can open a product's detail dialog without auth.
- As any user, I see Spanish loading and error states.

**Acceptance criteria**

- `PublicCatalogPage` calls `GET /catalog/{catalogId}` and `GET /catalog/{catalogId}/items` without sending an `Authorization` header.
- Invalid id renders a Spanish 404 page.
- The seeded ids from `CLAUDE.md` (`6a0365fdf74fdcb617a8a5b6`, `…5c3`, `…5d0`) work end-to-end against `localhost:3001`.
- `PublicCatalogContext` shape stays stable — no presentational component changes.

**API**

- `GET /catalog/{catalogId}` (public read)
- `GET /catalog/{catalogId}/items`

**Tasks**

- [ ] Update `PublicCatalogContext` to call real actions when `!IS_DEV_STAGE`
- [ ] Add `unauthenticated: true` flag on `api.ts` to skip auth header
- [ ] 404 component for invalid catalog
- [ ] End-to-end smoke against `localhost:3001` with each seeded id
- [ ] Update the existing page-level test to cover the new error path

---

## Week 7 — Password recovery + email verification

**Goal:** sellers can reset a forgotten password and activate a newly-created account from the verification email (closes Login Screens epic #2 and unblocks the W1 follow-up).

**User stories**

- As a seller who forgot my password, I can request a recovery email.
- As a seller, I can click the recovery email link, validate the token, and set a new password.
- As a new seller, I can click the verification link from the signup email to activate my account, then land on `/login`.

**Acceptance criteria**

- `/recover` form calls `POST /recover`. Spanish success message shown regardless of whether the email exists (anti-enumeration).
- `/reset/:token` validates via `GET /validate/{token}` on mount. Invalid token → Spanish error and a link back to `/recover`.
- Submitting calls `POST /reset` with the token + new password. Success → redirect to `/login` with a Spanish confirmation toast.
- `/verify/:token` calls `GET /validate/{token}` on mount. Success → Spanish "Cuenta activada" + button to `/login`. Failure → Spanish error + button to re-signup or contact support.

**API**

- `POST /recover`
- `GET /validate/{token}` (shared by reset and verify flows)
- `POST /reset`

**Tasks**

- [ ] `actions/requestRecovery.ts`, `actions/validateToken.ts`, `actions/resetPassword.ts` (+ mocks)
- [ ] `RecoverPage`, `ResetPasswordPage`, `VerifyEmailPage`
- [ ] Register `/recover`, `/reset/:token`, `/verify/:token`; link recover from `LoginPage`
- [ ] Confirm with backend whether `/validate/{token}` distinguishes verification tokens from reset tokens (one endpoint vs. two semantically different uses)
- [ ] Tests for both pages

---

## Week 8 — Hardening + barebones polish

**Goal:** the MVP is stable enough to share with real sellers. No new features.

**Scope**

- Global error boundary with a Spanish fallback UI.
- `/404` route + catch-all handling.
- Loading skeletons on every async page (including `ProtectedRoute` boot state — replaces the current "Cargando..." text from W1).
- A single `useToast` hook for all form feedback; migrate the W1 login/signup inline alerts onto it.
- Proactive JWT refresh (decode `exp` and refresh before expiry) so the first request after expiry doesn't pay a 401-hop. Carried over from W1.
- Refresh-token race guard (single in-flight `/refresh` promise) — only if a bug surfaces.
- Split `useAuth` out of `AuthContext.tsx` to clear the `react-refresh/only-export-components` warning (matches treatment of other context files in the repo).
- `vite build` passes; `npm run lint` clean; `npm test` green.
- Manual run-through of every user story above on a phone-sized viewport.
- README updated with `VITE_API_BASE_URL` and the dev-stage flag.

**Acceptance criteria**

- A new seller can: sign up → create a catalog → add three products with images → share the public link → recover their password — all without console errors.
- All seeded users from `CLAUDE.md` work against the local backend.

---

## Carry-over backlog (must close before production)

Single source of truth for work surfaced mid-epic that did not ship in its origin week. Every item must be assigned to a future MVP week before MVP can be called done. Owners are weeks, not people.

| # | Item | Origin | Owner | Status |
|---|------|--------|-------|--------|
| C1 | Email verification page (`/verify/:token` → `GET /validate/{token}`) | W1 | W7 | ⏳ pending |
| C2 | Proactive JWT refresh (refresh before `exp`, not on 401) | W1 | W8 | ⏳ pending |
| C3 | Migrate login/signup inline alerts to shared `useToast` hook | W1 | W8 | ⏳ pending |
| C4 | Replace `ProtectedRoute` boot "Cargando..." with a real skeleton | W1 | W8 | ⏳ pending |
| C5 | Refresh-token race guard (single in-flight `/refresh` promise) | W1 | W8 (only if reproduces) | ⏳ conditional |
| C6 | Split `useAuth` out of `AuthContext.tsx` (fast-refresh lint warning) | W1 | W8 | ⏳ pending |
| C7 | Item image upload endpoint shape — confirm with backend | roadmap draft | W5 | ⏳ pending |
| C8 | Confirm `/validate/{token}` is shared by reset + verify tokens or split | W1 | W7 | ⏳ pending |
| C9 | Replace hand-rolled modal overlay with shared shadcn `Dialog` primitive (covers `NewCatalogDialog`, `AddProductModal`, `EditCatalogModal`) | W2 | W8 | ⏳ pending |
| C10 | Migrate `/edit/catalog/:catalogId` shell off `fetchEditableCatalog` onto `fetchCatalog` via `api()` for proper auth + 401-refresh | W2 | W3 | ✅ closed in W3 |

Post-MVP carry-over (tracked here so it isn't lost, but explicitly not required for MVP launch):

| # | Item | Origin | Notes |
|---|------|--------|-------|
| P1 | Move token storage to HTTP-only cookies (or evaluate `sessionStorage` + remember-me) | W1 | Backend coordination required |
| P2 | Server-side logout / refresh-token revocation endpoint | W1 | Backend coordination required |
| P3 | Client-side inactivity / session timeout | W1 | Product decision |

Update this table whenever a follow-up item is created, picked up, or closed. **Never close a Week N epic with open W-N items missing from this table.**

---

## Post-MVP — parked epics (priority order)

1. **Theme & visual design** — palette, typography, spacing tokens in `@theme {}`. Replace barebones shadcn defaults app-wide.
2. **Home / Dashboard** (user epic #5) — sales + subscriptions overview after login. Uses `/sales/all`, `/subscription/user`.
3. **Browse Catalogs** (user epic #6) — search bar + nearby catalogs for unidentified users.
4. **Profile View** (user epic #7) — full profile management via `/profile/{id}` + `/profile/{id}/update`.
5. **App Settings View** (user epic #8) — preferences, notifications, account management.
6. **Subscriptions** — `/subscription/subscribe`, `/subscription/unsubscribe`, `/catalog/{id}/subscribe`, `/catalog/{id}/subscribers`.
7. **Transactions** — buyer cart + checkout via `/cart/*`, seller purchase/sales views via `/purchase/*`, `/sales/*`.
8. **Broadcasts + notifications** — `/catalog/{id}/broadcast`, `/notification/recent`, `/notification/all`.
9. **Membership tiers** — `/membership`.
10. **Geolocation** (called out in Catalog concept) — public discovery by proximity.
11. **WhatsApp order flow** — buyer taps a product → prefilled WA message to the seller.
12. **Payments** — online checkout (Stripe / Mercado Pago).

---

## Tracking

Add a row per week as work lands. Link the merge commit and any open follow-ups.

| Week | Epic | Status | PR / commit | Follow-ups |
|------|------|--------|-------------|------------|
| 1 | Nav shell + auth | ✅ shipped | branch `ALK-1-W1`, commit `e6aab8d` | Email verification page → W7; proactive refresh + toasts + skeleton → W8; cookie/HTTP-only token storage → post-MVP security review |
| 2 | Private Catalog (list + create) | ✅ shipped | branch `ALK-3-W2` | Replace hand-rolled dialog with shadcn `Dialog` primitive → W8; migrate edit shell off `fetchEditableCatalog` onto `fetchCatalog` via `api()` → W3 |
| 3 | Private Catalog (edit + items) | ✅ shipped | branch `ALK-3-W3` | Shared shadcn `Dialog` primitive → W8 (C9); collapse `mockFetchEditableCatalog` into `mockFetchCatalog` → W8 |
| 4 | Private Product CRUD | ✅ shipped | branch `ALK-4-W4` | Real image upload → W5; shared shadcn `Dialog` primitive → W8 (C9) |
| 5 | Image upload | ⏳ pending | — | — |
| 6 | Public Catalog wired | ⏳ pending | — | — |
| 7 | Password recovery | ⏳ pending | — | — |
| 8 | Hardening | ⏳ pending | — | — |