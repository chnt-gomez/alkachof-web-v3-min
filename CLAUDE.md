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
