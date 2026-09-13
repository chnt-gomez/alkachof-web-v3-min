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
npm run preview   # serve the production build locally
```

## Environment

Vite picks the file by mode: the dev server reads `.env.development`, and
`npm run build` (always `mode=production`) reads `.env.production`. Both are
committed. Everything prefixed `VITE_` is compiled into the bundle and readable
by anyone — **never put a secret in either file**. To override locally without
touching the committed files, copy `.env.example` to `.env.local`.

| Var | Purpose |
|-----|---------|
| `VITE_API_BASE_URL` | Base URL the `api()` wrapper in `src/lib/api.ts` prepends to every request, and the Socket.IO host for the `/live` namespace. Point at `http://localhost:3001` for a local backend. |
| `VITE_DEV_STAGE` | When `true`, every action short-circuits through a paired mock in `src/mocks/` instead of hitting the network — see `src/lib/stage.ts`. Lets you run the UI with no backend at all. Must stay `false` in `.env.production`. |
| `VITE_PUBLIC_APP_URL` | Root used to build shareable catalog links. |

## Versioning

Every build stamps itself. Nothing is displayed to users — these are for
answering "what is actually deployed?".

```bash
curl -s https://app.alkachof.mx/version.json
# { "version": "0.0.1", "sha": "0f7012f", "builtAt": "...", "buildId": "..." }

curl -s https://app.alkachof.mx/ | grep 'name="build-sha"'
```

The same three facts are `<meta>` tags in `index.html`, so view-source answers it
too. Both are produced by the `alkachof-version` plugin in `vite.config.ts` and
are served in dev as well, so a smoke test does not need to know which stage it
is pointed at.

`version` comes from `package.json` — bump it with `npm version patch|minor|major`,
which also writes the commit and tag. `sha` and `builtAt` come from the build
itself and need no maintenance; a build from a dirty working tree is marked
`-dirty`.

**Deploy requirement:** `/version.json` and `/index.html` must be served with
`Cache-Control: no-cache`. Hashed files under `/assets/` are immutable and should
be cached hard.

## Seeded data

The following test fixtures are provisioned on the backend (also documented in
`CLAUDE.md`):

- Public catalogs: `6a0365fdf74fdcb617a8a5b6`, `6a0365fdf74fdcb617a8a5c3`, `6a0365fdf74fdcb617a8a5d0`
- Users: `user@admin.com`, `user2@admin.com`, `user3@admin.com` — password `admin`
