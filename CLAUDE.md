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

Current routes: `/` → `HomePage`, `/catalog` → `CatalogPage`, `/product/:id` → `ProductPage`.

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

### Test data.
Data has been seeded for testing the UI
Public Catalog available ids: 6a0365fdf74fdcb617a8a5b6, 6a0365fdf74fdcb617a8a5c3, 6a0365fdf74fdcb617a8a5d0

Users/Passwords:    user@admin.com / admin
                    user2@admin.com / admin 
                    user3@admin.com / admin


