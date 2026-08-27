# Blueprint — Invitation Page (`/join`)

**Status:** plan only. No code in this document is written yet.
**Source:** `feature.InvitationPage.md`.
**Scope:** UI only. **No new endpoints, no new actions, no new mocks** — every call this page needs
already exists and is already mocked.

---

## 1. What it is

A share target. A seller sends `alkachof.com/join?catalogId=<id>` to someone; that link opens a
one-screen landing page showing the catalog's image, its welcome text, and one line of static copy,
under a single button into the catalog.

It is the *outward-facing twin of `/about`*: same shape (public, full-screen, no bottom tabs, one
CTA), but personalised to the inviting catalog instead of generic.

The button is the only branch on this page:

| Viewer | Button | Behaviour |
|---|---|---|
| Guest (not logged in) | **Ver catálogo** | `<Link to="/catalog/:catalogId">` — no backend call |
| Logged in, not subscribed, not the owner | **Suscribirme** | `subscribe()` → toast → navigate to the catalog |
| Logged in, already subscribed | **Ver catálogo** | plain navigation — see §5.1 |
| Logged in, **is the owner** | **Ver catálogo** | plain navigation — see §5.2 |

---

## 2. The URL

```
/join?catalogId=6a0365fdf74fdcb617a8a5b6
```

A **query param**, not a path segment — the feature doc specifies "parameters in the GET request",
and this keeps room for future invite params (`?ref=`, `?campaign=`) without new route shapes. Read
it with `useSearchParams()` (the pattern `useTransactionDeepLink` already uses), *not* `useParams`.

The doc types it "UUID"; the API's ids are Mongo ObjectIds (24-hex). The page must **not** validate
the format — it passes the string straight to `fetchPublicCatalog` and lets a 404 answer the
question. A client-side format check would reject valid ids the day the API's id scheme changes.

### Router registration

`src/router/AppRouter.tsx` — one line, placed **beside `/about`**, outside both `NavShell` and
`ProtectedRoute`:

```tsx
<Route path="/about" element={<AboutPage />} />
<Route path="/join" element={<JoinPage />} />
```

Outside `NavShell` because a stranger arriving from a WhatsApp link has no tabs to use, and the
bottom bar would advertise Pedidos/Chats to someone with no account. Outside `ProtectedRoute`
because the entire point is that the recipient has no account yet. It is still inside `AuthProvider`
/ `NotificationsProvider` / `CartProvider` (they wrap `<Routes>` wholesale), so `useAuth()` works
normally.

---

## 3. Files

```
src/sections/join/
├── JoinPage.tsx                    # new — route-level orchestrator, the only file the router imports
├── components/
│   └── InvitationCard.tsx          # new — the catalog hero: image + alias + welcome text
└── __tests__/
    └── JoinPage.test.tsx           # new
```

Plus one line in `src/router/AppRouter.tsx` (route) and its import.

**That is the entire diff.** Nothing under `src/sections/publicCatalog/` changes; nothing under
`src/mocks/` changes; `src/lib/` is untouched.

### 3.1 What it reuses instead of rebuilding

| Need | Reuse | From |
|---|---|---|
| Catalog data (`alias`, `welcomeText`, `image`, `userId`) | `fetchPublicCatalog(catalogId)` | `@/sections/publicCatalog/actions/fetchPublicCatalog` |
| Subscribe + already-subscribed state | `useCatalogSubscription(catalogId, enabled)` | `@/sections/publicCatalog/hooks/useCatalogSubscription` |
| The image, at natural aspect ratio | `CatalogHeroImage` | `@/components/CatalogImage` |
| 404 screen | `CatalogNotFound` | `@/sections/publicCatalog/components/CatalogNotFound` |
| Brand lockup | `BrandMark size="lg"` | `@/components/BrandMark` |
| CTA | `Button size="lg" asChild` | `@/components/ui/button` |
| Success/failure feedback | `useToast()` | `@/components/ui/useToast` |

Cross-section imports from `publicCatalog` are consistent with how `PublicCatalogPage` already
imports `CartBookTag`/`CartDrawer` from `sections/cart`. `fetchPublicCatalog` and its `Catalog` type
stay owned by `publicCatalog` — do **not** copy the type into `sections/join`.

`fetchPublicCatalog` is already dev-stage-guarded (`mockFetchPublicCatalog`), as are `subscribe` and
`fetchUserSubscriptions`. Rule 1 of the mock contract is satisfied with zero new files.

---

## 4. `JoinPage.tsx`

```
JoinPage
├─ no catalogId param      → "Falta el catálogo de la invitación." (see §5.4)
├─ isLoading               → spinner, aria-busy, "Cargando invitación…"
├─ notFound (ApiError 404) → <CatalogNotFound />
├─ error                   → text-destructive message
└─ loaded                  → <BrandMark/> + <InvitationCard/> + static line + CTA
```

Local state only — a `useState` triple (`catalog` / `isLoading` / `error|notFound`) fed by one
`useEffect` calling `fetchPublicCatalog`. **No context and no provider.** `PublicCatalogProvider`
would be the wrong reuse here: it also fetches the item list, which this page never renders.

Mirror `PublicCatalogContext`'s error branching exactly, including the `ApiError` 404 test:

```ts
.catch((err: Error) => {
  if (err instanceof ApiError && err.status === 404) { setNotFound(true); return }
  setError(err.message)
})
```

### Layout

Follow `AboutPage`'s frame verbatim so the two landing pages read as one family:

```
<div className="flex min-h-dvh flex-col bg-gradient-to-b from-secondary via-background to-background px-5 py-10">
  <header>  <BrandMark size="lg" />                       </header>
  <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 py-10">
    <InvitationCard catalog={catalog} />
    <p> {alias} te quiere invitar a Alkachof … </p>
    <CTA />
    (guest only) "¿Aún no tienes cuenta? Crea una" → /signup
  </main>
</div>
```

### `InvitationCard.tsx`

A primary-gradient card matching the `CatalogJumbotron` header — `bg-gradient-to-br from-primary
to-primary-deep … text-primary-foreground` — holding, in order: `catalog.alias` as the `h1`,
`catalog.welcomeText` under it, then `<CatalogHeroImage src={catalog.image} alt={catalog.alias} />`.

The gradient is **not decoration** — `CatalogHeroImage`'s placeholder branch is styled with
`border-primary-foreground/40` and `text-primary-foreground/70`, which are only legible on a
`primary` background. Rendering it on `bg-background` gives an invisible placeholder for every
catalog with no image.

`welcomeText` can be `''` — render it conditionally, the way `CatalogJumbotron` does. `image` is
**absent, not null or `''`**, when unset; `CatalogHeroImage` already branches on presence, so pass
it straight through.

Golden rules apply to the image and are satisfied by reusing `CatalogHeroImage`: `object-contain` +
`w-full`, **no `object-cover`, no fixed height**. Do not re-implement the `<img>`.

### Copy (es-MX, exact)

| Element | Text |
|---|---|
| Static invitation line | `{alias} te quiere invitar a Alkachof para que veas su catálogo de productos y servicios` |
| CTA — guest / subscribed / owner | `Ver catálogo` |
| CTA — can subscribe | `Suscribirme` |
| CTA — subscribe in flight | `Suscribiendo…` |
| Loading | `Cargando invitación…` |
| Subscribe success toast | `¡Listo! Te suscribiste y recibirás sus novedades.` |
| Subscribe failure toast | error message, else `No se pudo completar la acción.` |
| Guest footnote | `¿Aún no tienes cuenta?` + `Crea una` → `/signup` |

Two deliberate deviations from the feature doc's wording:

- The doc writes **"Subscribirse"**. Correct es-MX is *suscribirse* (no *b*), and the live label in
  `CatalogJumbotron` is **"Suscribirme"** — first person, matching every other CTA in the app. Use
  **Suscribirme**; a second spelling of the same action across two screens is a bug in the product,
  not a variant.
- The success/failure toast strings are copied verbatim from `CatalogJumbotron.handleSubscribe`, so
  subscribing feels identical wherever it happens.

---

## 5. The four decisions the feature doc leaves open

These are the parts worth agreeing on before code is written.

### 5.1 Already subscribed

`useCatalogSubscription` exposes a **`toggle`**, not a subscribe. Calling it for someone who already
follows the catalog would *unsubscribe* them — an invite link that silently unfollows the sender is
the worst possible outcome here.

So the page reads `isSubscribed` and, when true, renders **Ver catálogo** and never calls `toggle`.
`toggle` is invoked on exactly one path: authenticated, non-owner, `isSubscribed === false`.

Cost: one extra `GET /subscription/user` for logged-in viewers. Worth it — the alternative (fire
subscribe blind) either duplicates rows or surfaces a 409 as a scary red toast on a welcome screen.

While that lookup is in flight (`isLoading` from the hook), the button renders as **Ver catálogo**
in a `disabled` state rather than flickering *Suscribirme → Ver catálogo*.

### 5.2 The owner opens their own link

Sellers will click their own invite link to check it — it is the first thing anyone does after
sharing one. `subscribe` against your own catalog is meaningless and the backend rejects it, so:

```ts
const isOwner = Boolean(catalog && profile && catalog.userId === profile.userId)
```

…and the owner gets **Ver catálogo**. Same computation and same rationale as
`PublicCatalogContext.isOwner`; `useCatalogSubscription`'s `enabled` flag takes
`isAuthenticated && !isOwner`, exactly as `CatalogJumbotron` passes it.

### 5.3 Subscribe fails

The doc says subscribe "will be redirected to the catalog". On **success** that is right: toast, then
`navigate('/catalog/' + catalogId)`.

On **failure**, do *not* navigate. Show the error toast and leave the button enabled so they can
retry. Redirecting past a failure tells the user they subscribed when they did not, and the catalog
page's own Suscribirme button is the only place they'd find out otherwise.

`useCatalogSubscription.toggle` rethrows on failure specifically so the caller can do this; wrap it
in try/catch the way `handleSubscribe` does today.

### 5.4 `catalogId` missing or empty

`/join` with no param is a truncated share link — common enough to handle deliberately. Render a
short message (`Esta invitación no es válida.` + a `Conoce Alkachof` link to `/about`) rather than
falling through to `NotFoundPage`, which would tell the recipient the *page* doesn't exist.

A **present but unknown** id is different: that's a real 404 from the API and gets `CatalogNotFound`,
whose copy ("El catálogo que buscas no existe o ya no está disponible") is already right.

---

## 6. Tests — `src/sections/join/__tests__/JoinPage.test.tsx`

Page-level, per the repo strategy: render `<JoinPage />` inside a `MemoryRouter` with
`initialEntries={['/join?catalogId=abc123']}` and a `Routes` stub for `/catalog/:catalogId` so
navigation is assertable by the stub's text appearing.

Mock the action modules, never the components:

```ts
vi.mock('@/sections/publicCatalog/actions/fetchPublicCatalog')
vi.mock('@/sections/publicCatalog/actions/fetchUserSubscriptions')
vi.mock('@/sections/publicCatalog/actions/subscribe')
vi.mock('@/sections/publicCatalog/actions/unsubscribe')   // hook imports it; leave it inert
vi.mock('@/sections/auth/useAuth', () => ({ useAuth: () => authState }))
```

Auth is varied per test through a mutable `authState` object — the same `vi.mock('@/sections/auth/useAuth')`
shape `PublicCatalogPage.test.tsx` uses.

| # | Case | Assert |
|---|---|---|
| 1 | Loaded, any viewer | alias heading + the exact static invitation line, alias interpolated |
| 2 | Catalog has an image | `<img>` with the catalog's `src`; catalog with no `image` → the placeholder's `aria-label` |
| 3 | Guest | link named `Ver catálogo` with `href="/catalog/abc123"`; **no** `Suscribirme` button |
| 4 | Auth'd non-owner, not subscribed | `Suscribirme` present; clicking calls `subscribe('abc123')` **once** and lands on the catalog stub |
| 5 | Auth'd non-owner, subscribed | `Ver catálogo`; `subscribe` and `unsubscribe` never called |
| 6 | Owner (`catalog.userId === profile.userId`) | `Ver catálogo`; `fetchUserSubscriptions` never called |
| 7 | `subscribe` rejects | still on the join page, button re-enabled, no navigation |
| 8 | `fetchPublicCatalog` rejects `ApiError(404)` | `Catálogo no encontrado` |
| 9 | `fetchPublicCatalog` rejects generic | the error message renders |
| 10 | No `catalogId` in the query | the invalid-invitation copy, and `fetchPublicCatalog` never called |

Test names in English. Cases 5, 6 and 7 are the ones that catch the §5 regressions — they are the
reason this list isn't three tests long.

---

## 7. Order of work

1. `JoinPage.tsx` — fetch, the four states, layout frame. Wire the route. Guest CTA only.
2. `InvitationCard.tsx` — extract the hero out of step 1.
3. Auth branch — `useCatalogSubscription`, `isOwner`, the subscribe/navigate path, toasts.
4. Tests (§6).
5. `npm run build && npm run lint && npm test` — the suite is green at baseline, so any red is new.

Steps 1–2 are shippable on their own: the page works for its main audience (people without an
account) before step 3 exists.

---

## 8. Explicitly out of scope

- **No API change.** No new endpoint, no invite tokens, no attribution of a signup back to the
  inviting catalog. If "who invited whom" is ever needed, it is a backend feature, not this page.
- **No share-link generator.** Nothing in the app yet produces a `/join?catalogId=…` URL — the seller
  composes it by hand. A "Compartir mi catálogo" button in `CatalogPage` (Web Share API +
  clipboard fallback) is the obvious next story and is *not* in this one.
- **No signup deep-link return.** A guest who taps "Crea una" goes to `/signup` and lands wherever
  signup normally lands. Threading `location.state.from` back to `/join` (the `GuestCheckoutPrompt`
  pattern) is a follow-up, not required by the feature doc.
- **No catalog items, questions, cart, or location** on this page. It is a doorway.
