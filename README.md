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

The dev server reads `.env.development`. The two vars that matter:

| Var | Default (`.env.development`) | Purpose |
|-----|------------------------------|---------|
| `VITE_API_BASE_URL` | `http://localhost:3001` | Base URL the `api()` wrapper in `src/lib/api.ts` prepends to every request. |
| `VITE_PUBLIC_APP_URL` | `http://localhost:5134` | Public app root used to build shareable catalog and product links (`src/lib/shareUrl.ts`). |

**The dev server needs a reachable API.** There is no mock layer and no offline
mode — run `alkachof-api` on `localhost:3001` before `npm run dev`. (The client
used to ship a `VITE_DEV_STAGE` flag that served every action from `src/mocks/`;
it was removed — see `blueprint.RemoveDevStageMocks.md`.)

## Seeded data

The following test fixtures are provisioned on the backend (also documented in
`CLAUDE.md`):

- Public catalogs: `6a0365fdf74fdcb617a8a5b6`, `6a0365fdf74fdcb617a8a5c3`, `6a0365fdf74fdcb617a8a5d0`
- Users: `user@admin.com`, `user2@admin.com`, `user3@admin.com` — password `admin`
