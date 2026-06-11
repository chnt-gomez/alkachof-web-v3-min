I want to build the foundations and architecture of a small e-commerce platform.
The platform allows registered users to submit products and services to offer them on what we call Catalogs. Each catalog has a limited number of products or services. for now they only have 1 image, price and a description.
 We want to focus on a react stack using talwind and shadcn to drive the development of this page and work exclusively on small screens resolutions because the app is designed to be visited on phones, not on desktops.
 We want to use native shadcn components and we will later define the look and feel.
 We will focus on archutecture, rather than styling for now. Leaving room for creating pages, components, hooks and actions after.

1. Your task is to create first a 'hello world' using vite and install all dependencies that we will use for this project.

2. Create a basic srchitecture to start developing components. We will create 'sections' each one with a landing page (as a component orchestrator) and its own sub directories like hooks and components.

3. Define a simple routing strategy to allow us grow vertically and horizontally

---

## Drift notes (added 2026-06-11)

- **Stack landed:** Vite 6 + React 19 + TypeScript 5.8 + Tailwind v4 (no `tailwind.config.js`; theme tokens in `src/index.css` under `@theme {}`) + React Router v7. Shadcn primitives are hand-written under `src/components/ui/`, not CLI-generated.
- **Sections pattern is in place** — `src/sections/<name>/{<Name>Page.tsx, components/, hooks/}`. Routes are registered in `src/router/AppRouter.tsx`.
- **Routing strategy in CLAUDE.md is the source of truth** for current routes. This file captures the original intent only.
