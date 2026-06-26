# Alkachof Web

Small-screen-first e-commerce platform for very small sellers in Latin America.
Vite + React 19 + TypeScript + Tailwind v4. See `CLAUDE.md` for the architecture
notes the team works from.

## Quick start

```bash
npm install
npm run dev       # start Vite on http://localhost:5173
npm run build     # type-check + production build
npm run lint      # ESLint
npm test          # Vitest (single run)
npm run test:watch
```

## Environment

The dev server reads `.env.development`. The two flags that matter:

| Var | Default (`.env.development`) | Purpose |
|-----|------------------------------|---------|
| `VITE_API_BASE_URL` | `http://localhost:3001` | Base URL the `api()` wrapper in `src/lib/api.ts` prepends to every request. |
| `VITE_DEV_STAGE` | `true` | When `true`, every action short-circuits through a paired mock in `src/mocks/` instead of hitting the network — see `src/lib/stage.ts`. Set to `false` to exercise the real backend. |

`VITE_DEV_STAGE=true` is the local default so you can run the UI without the
backend. Flip it off (or override the env var inline) when you need to smoke
test against a real `localhost:3001`.

## Seeded data

When running against the real backend (`VITE_DEV_STAGE=false`), the following
test fixtures are provisioned (also documented in `CLAUDE.md`):

- Public catalogs: `6a0365fdf74fdcb617a8a5b6`, `6a0365fdf74fdcb617a8a5c3`, `6a0365fdf74fdcb617a8a5d0`
- Users: `user@admin.com`, `user2@admin.com`, `user3@admin.com` — password `admin`
