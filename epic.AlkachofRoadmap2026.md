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

## Week 1 — Navigation shell + auth (sign-up + login)

**Goal:** the whole app lives inside a persistent navigation shell. A new visitor can register, log in, and land on the shell. JWT persists across refreshes.

**User stories**

- As any user, every screen renders inside a shared navigation menu.
- As a new seller, I can sign up with email + password.
- As a returning seller, I can log in.
- As a logged-in seller, refreshing the page keeps me logged in.
- As a logged-in seller, I can log out and my token is cleared.

**Acceptance criteria**

- A `<NavShell>` wraps all routes. Shows app title, current section, and an auth-aware menu (login/logout).
- `/login` and `/signup` render shadcn forms with Spanish validation messages.
- `POST /signup` and `POST /login` store the JWT in `localStorage` and redirect to the logged-in home.
- `ProtectedRoute` redirects unauthenticated users to `/login`.
- `AuthContext` exposes `user`, `token`, `login`, `signup`, `logout`.
- Failed login surfaces a Spanish error toast without revealing which field was wrong.

**API**

- `POST /signup` → `{ token, user }`
- `POST /login` → `{ token, user }`
- `POST /refresh` → `{ token }` (used on 401 retry)
- `GET /profile` → current user (called on boot if a token exists)

**Tasks**

- [ ] `src/lib/api.ts` fetch wrapper with auth header + 401-refresh-retry
- [ ] `src/lib/auth.ts` localStorage helpers
- [ ] `src/components/NavShell.tsx` (barebones shadcn)
- [ ] `src/sections/auth/` with `LoginPage`, `SignupPage`, `AuthContext`, `useAuth`
- [ ] `actions/login.ts`, `actions/signup.ts`, `actions/fetchProfile.ts` (+ mocks)
- [ ] `ProtectedRoute` in `src/router/`
- [ ] Wire `/login`, `/signup` into `AppRouter.tsx`; guard private routes
- [ ] Page-level tests: login happy + error, signup happy + error

---

## Week 2 — Private Catalog View (list + create)

**Goal:** a logged-in seller sees their catalog and can configure its basics.

**User stories**

- As a seller, I see my catalog when I open the app.
- As a seller without a catalog yet, I can create one with title, description, payment types, and shipment options.
- As a seller, tapping my catalog opens its detail view.

**Acceptance criteria**

- Logged-in home shows the seller's catalog as a shadcn card (or empty-state CTA if none).
- "Nuevo catálogo" opens a shadcn `Dialog` with a validated form. Success closes and reveals the new catalog.
- Loading skeleton during fetch; error state with retry.
- Empty state in Spanish with a clear CTA.

**API**

- `GET /catalog` → list of catalogs owned by current user
- `POST /catalog/new` → created catalog
- `GET /catalog/{catalogId}` → catalog metadata (for detail view)

**Tasks**

- [ ] `actions/fetchMyCatalogs.ts`, `actions/createCatalog.ts`, `actions/fetchCatalog.ts` (+ mocks)
- [ ] `src/sections/catalogs/CatalogsPage.tsx`
- [ ] `NewCatalogDialog` component
- [ ] Wire to logged-in home; update `CatalogPage` to fetch real data
- [ ] Page-level tests: empty state, list render, create flow

---

## Week 3 — Private Catalog View (edit metadata + item list)

**Goal:** a seller can rename and configure their catalog and see its products.

**User stories**

- As a seller, I can edit my catalog's title, description, payment types, and shipment options.
- As a seller, I see all products inside my catalog.
- As a seller, I can navigate to a product's private detail view.

**Acceptance criteria**

- Catalog detail page exposes editable metadata behind an "Editar" affordance.
- `POST /catalog/{id}/update` is called on save; UI updates optimistically and rolls back on error.
- Products render in the `columns-2` masonry per the golden rules (no `object-cover`, no fixed image heights).
- Empty-products state in Spanish with CTA to add the first product.

**API**

- `POST /catalog/{catalogId}/update`
- `GET /catalog/{catalogId}/items`
- `GET /item/{itemId}`

**Tasks**

- [ ] `actions/updateCatalog.ts`, `actions/fetchCatalogItems.ts`, `actions/fetchItem.ts` (+ mocks)
- [ ] `EditCatalogDialog`
- [ ] Refactor `CatalogPage` to render real items
- [ ] Refactor `ProductPage` to fetch by id
- [ ] Tests: edit happy path, optimistic rollback, item list render

---

## Week 4 — Private Product View (CRUD)

**Goal:** a seller can add, edit, and delete products in their catalog. Blank products (picture only) are valid per the concept definition.

**User stories**

- As a seller, I can add a product with at least a picture; title/description/price/stock are optional.
- As a seller, I can edit any existing product.
- As a seller, I can delete a product with a confirmation step.

**Acceptance criteria**

- "Agregar producto" opens a shadcn `Dialog` with validated form (price ≥ 0 when present).
- Edit reuses the same form, pre-filled.
- Delete shows an `AlertDialog` ("¿Eliminar producto?"). Cannot be undone.
- Prices formatted via `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
- A product with only an image and no other fields renders cleanly.

**API**

- `POST /catalog/{catalogId}/item/add`
- `POST /item/{itemId}/update`
- `POST /item/{itemId}/delete`

**Tasks**

- [ ] `actions/addItem.ts`, `actions/updateItem.ts`, `actions/deleteItem.ts` (+ mocks)
- [ ] `ItemFormDialog` (shared create/edit)
- [ ] `DeleteItemConfirm`
- [ ] Wire CTAs into catalog detail and product detail pages
- [ ] Tests: add, edit, delete flows; blank-product render

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

## Week 7 — Password recovery

**Goal:** sellers can reset a forgotten password (closes Login Screens epic #2).

**User stories**

- As a seller who forgot my password, I can request a recovery email.
- As a seller, I can click the email link, validate the token, and set a new password.

**Acceptance criteria**

- `/recover` form calls `POST /recover`. Spanish success message shown regardless of whether the email exists (anti-enumeration).
- `/reset/:token` validates via `GET /validate/{token}` on mount. Invalid token → Spanish error and a link back to `/recover`.
- Submitting calls `POST /reset` with the token + new password. Success → redirect to `/login` with a Spanish confirmation toast.

**API**

- `POST /recover`
- `GET /validate/{token}`
- `POST /reset`

**Tasks**

- [ ] `actions/requestRecovery.ts`, `actions/validateResetToken.ts`, `actions/resetPassword.ts` (+ mocks)
- [ ] `RecoverPage`, `ResetPasswordPage`
- [ ] Register routes; link from `LoginPage`
- [ ] Tests for both pages

---

## Week 8 — Hardening + barebones polish

**Goal:** the MVP is stable enough to share with real sellers. No new features.

**Scope**

- Global error boundary with a Spanish fallback UI.
- `/404` route + catch-all handling.
- Loading skeletons on every async page.
- A single `useToast` hook for all form feedback.
- `vite build` passes; `npm run lint` clean; `npm test` green.
- Manual run-through of every user story above on a phone-sized viewport.
- README updated with `VITE_API_BASE_URL` and the dev-stage flag.

**Acceptance criteria**

- A new seller can: sign up → create a catalog → add three products with images → share the public link → recover their password — all without console errors.
- All seeded users from `CLAUDE.md` work against the local backend.

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
| 1 | Nav shell + auth | ⏳ pending | — | — |
| 2 | Private Catalog (list + create) | ⏳ pending | — | — |
| 3 | Private Catalog (edit + items) | ⏳ pending | — | — |
| 4 | Private Product CRUD | ⏳ pending | — | — |
| 5 | Image upload | ⏳ pending | — | — |
| 6 | Public Catalog wired | ⏳ pending | — | — |
| 7 | Password recovery | ⏳ pending | — | — |
| 8 | Hardening | ⏳ pending | — | — |