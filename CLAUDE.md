# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite)
npm run build     # type-check + production build
npm run lint      # ESLint
npm run preview   # serve the production build locally
```

## Architecture

Small-screen-first e-commerce platform. All UI targets phone resolutions — no desktop layouts.

### Stack

- **Vite 6** + **React 19** + **TypeScript 5.8**
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.js`; theme tokens live in `src/index.css` under `@theme {}`
- **Shadcn-style** UI primitives in `src/components/ui/` (hand-written, not CLI-generated); uses `cva`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`
- **React Router v7** — routes declared in `src/router/AppRouter.tsx`

### Routing

All routes are registered in `src/router/AppRouter.tsx`. Adding a section = create the folder + register one `<Route>` there.

Current routes:
- `/` → `HomePage`
- `/catalog` → `CatalogPage`
- `/product/:id` → `ProductPage`
- `/public/catalog/:catalogId` → `PublicCatalogPage`

### Sections pattern

Each feature lives in `src/sections/<name>/`:

```
sections/<name>/
├── <Name>Page.tsx      # route-level orchestrator component
├── components/         # section-local presentational components
└── hooks/              # section-local custom hooks
```

`<Name>Page.tsx` is the only file imported by the router. Everything else is internal to the section.

### Theming

CSS custom properties are defined in `src/index.css` using Tailwind v4's `@theme {}` block (e.g. `--color-primary`, `--color-muted-foreground`). Components reference these via Tailwind utilities like `bg-primary`, `text-muted-foreground`. Do not add a `tailwind.config.js` — extend the theme in `index.css` instead.

### Path alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### Language

All text **visible to the end user** (labels, messages, placeholders, tooltips, error strings rendered in the UI) must be written in **Spanish**. The target audience is Latin American users. Use `es-MX` locale for formatting (e.g. currency).

Everything developer-facing stays in English: code identifiers, comments, variable names, file names, test descriptions, and log messages.

### Testing

**Stack:** Vitest + React Testing Library + jsdom. Setup file at `src/test/setup.ts` (imports `@testing-library/jest-dom`).

**Commands:**
```bash
npm test          # single run
npm run test:watch  # watch mode
```

**File location:** co-locate tests inside the section under `__tests__/`:
```
sections/<name>/
└── __tests__/
    └── <Name>Page.test.tsx
```

**Strategy:** Test at the page level by rendering `<NamePage>` inside a `MemoryRouter`. Mock action modules with `vi.mock` — never mock the context or individual components. Assert on DOM output (text, roles), not component internals.

**Do not test** presentational components in isolation — the page-level integration test covers their output.

**Test descriptions** stay in English (developer-facing).

### Component locations

Key components and their file paths for quick reference:

| Component | Path |
|-----------|------|
| `PublicCatalogPage` | `src/sections/publicCatalog/PublicCatalogPage.tsx` |
| `CatalogJumbotron` | `src/sections/publicCatalog/components/CatalogJumbotron.tsx` |
| `CatalogItemList` | `src/sections/publicCatalog/components/CatalogItemList.tsx` |
| `ProductDetailDialog` | `src/sections/publicCatalog/components/ProductDetailDialog.tsx` |
| `PublicCatalogContext` | `src/sections/publicCatalog/context/PublicCatalogContext.tsx` |
| UI primitives | `src/components/ui/` (`button.tsx`, `card.tsx`) |

### Development stage

The UI supports a **development stage** that bypasses the backend entirely. This is the default when running `npm run dev`.

**How it works:** `src/lib/stage.ts` exports `IS_DEV_STAGE`, which reads the `VITE_DEV_STAGE` env var. When `true`, every action returns mock data instead of making HTTP calls. `.env.development` sets `VITE_DEV_STAGE=true`, so the dev server always runs in dev stage automatically.

**Mock structure:**

```
src/mocks/
├── index.ts                        # re-exports all mock generators
├── random.ts                       # shared helpers: pick(), randomInt(), randomId()
├── mock<ActionName>.ts             # one file per action
└── ...
```

**Rules for every new action:**

1. **Every action that makes an HTTP call must have a paired mock generator** in `src/mocks/mock<ActionName>.ts`.
2. **The mock must import and return the same type** as the real action — never redefine the type.
3. **Branch at the top of the action function** with a two-line guard:
   ```ts
   import { IS_DEV_STAGE } from '@/lib/stage'
   import { mockFetchMyThing } from '@/mocks'

   export async function fetchMyThing(id: string): Promise<MyThing> {
     if (IS_DEV_STAGE) return mockFetchMyThing(id)
     // ... real fetch
   }
   ```
4. **Mock generators return `Promise.resolve(data)` — no `setTimeout`, no real server, no network.** Data is created inline using helpers from `random.ts`.
5. **User-visible strings in mocks must be in Spanish (es-MX)** — names, descriptions, locations, etc. Identifiers and file names stay in English.
6. **Re-export the new mock from `src/mocks/index.ts`** so callers import from `@/mocks` only.
7. **Tests are not affected.** Tests `vi.mock` the action module directly, which replaces it entirely before the `IS_DEV_STAGE` branch is ever reached. Never change tests to accommodate mock files.

## Golden rules

### Image display

Images are the primary marketing channel for sellers. Violating these rules degrades the product.

- **Never use `object-cover`** on product images — it crops content.
- **Never apply a fixed height** to an image container — it forces blank space or cropping when the aspect ratio doesn't match.
- **Always use `object-contain` + `w-full`** so the image scales to fit its column width while preserving its natural aspect ratio and expanding the container vertically.
- For dialogs showing enlarged product images: cap the dialog at `max-h-[90vh]` with `overflow-y-auto` so very tall images remain scrollable without overflowing the viewport.

### Product grid layout

Use a **CSS `columns-2`** masonry layout (not `grid grid-cols-2`) for product lists. This stacks items down each column so cards with different image heights never leave trailing blank cells.

```tsx
<ul className="columns-2 gap-3">
  <li className="mb-3 break-inside-avoid"> … </li>
</ul>
```

### Test data.
Data has been seeded for testing the UI
Public Catalog available ids: 6a0365fdf74fdcb617a8a5b6, 6a0365fdf74fdcb617a8a5c3, 6a0365fdf74fdcb617a8a5d0

Users/Passwords:    user@admin.com / admin
                    user2@admin.com / admin 
                    user3@admin.com / admin


