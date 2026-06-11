### ALK-2105: Development stage for UI

## Current state
The UI web platform for ALkachof expects a backend running (and it should) but developing UI features this way can cause some pain.
We need to constatly seed backend catalogs and users and since we dont have a admin portal yet we have to edit most of things using the database UI. Most of UI is still in diapers and we dont have a way to manually create stiff for testing.

## Design criteria
The desired feature is to enable a way to distinguish a development stage for the UI and use it so the UI no longer needs to fetch stuff from the backend. The UI should be able to dynamically 'draw' elements from utility functions that Mock the expected behavior from the backend.

## Suggested plan
1. Refactor actions in the repository and establish a new design rule.
    1.1 All actions for HTTP calls should now distinguish betwen development stage and any other (yet to be implemented). When in development stage they should fall back to a utility mock 'server-like' local function that randomly creates information so they action uses it as a response.
2. Create a mock server-like function.
    2.1 The server like function should be a directory with specific js files to simply provide randomly generated data that matches the expected format of the action 'calling it'
    ### DO NOT create any actual servers. This wastes our limited resources
3. Test are not affected.
    3.1 In order to achieve this, the current unit tests should not be affected.

## Acceptance Criteria.
Based on the previous plan, create a specific set of instructions and add them here to the Execution step. We willl use a different model to execute simple yet design proof instructions to execute
### DO NOT EDIT ANY OTHER FILE THAN THIS DURING THE DESIGN SESSION

### Execution Step for the Agent:

You are implementing a "development stage" toggle so the UI can run without a live backend by falling back to local mock generators. Follow the steps below **exactly**. Do not invent additional features, do not create real servers, and do not modify tests.

#### 0. Ground rules

- **No real server.** No new Node processes, no Express, no MSW worker, no `npm install`. Mocks are plain TypeScript modules that return data synchronously (optionally wrapped in `Promise.resolve` to preserve the async signature).
- **Do not modify any file under `src/**/__tests__/`** and do not change any existing `vi.mock(...)` call sites. Tests already replace action modules wholesale, so internal branching in actions is invisible to them.
- **Do not change action public signatures** (exported function names, parameters, return types). Only their internal body changes.
- **Spanish for user-visible strings, English for code.** Mock data that is rendered in the UI (catalog `alias`, item `name`, `description`, etc.) must be in Spanish (es-MX). Identifiers, comments, and file names stay in English.
- **Scope:** only the two existing actions need to be migrated in this pass:
  - `src/sections/publicCatalog/actions/fetchPublicCatalog.ts`
  - `src/sections/publicCatalog/actions/fetchCatalogItems.ts`

#### 1. Add the development-stage flag

Create `src/lib/stage.ts` with a single exported boolean:

```ts
export const IS_DEV_STAGE = import.meta.env.VITE_DEV_STAGE === 'true'
```

Then create (or append to) `.env.development` at the repo root with:

```
VITE_DEV_STAGE=true
```

Do **not** create or modify `.env`, `.env.production`, or `.env.local`. Do not commit secrets.

#### 2. Create the mock "server-like" directory

Create the directory `src/mocks/` with the following files. Each file exports one function whose name mirrors the action it backs and whose return type matches the action's return type exactly (import the existing `Catalog` / `Item` types — do **not** redeclare them).

```
src/mocks/
├── index.ts                  # re-exports both generators
├── random.ts                 # tiny helpers: pick(arr), randomInt(min,max), randomId()
├── mockFetchPublicCatalog.ts # exports mockFetchPublicCatalog(catalogId): Promise<Catalog>
└── mockFetchCatalogItems.ts  # exports mockFetchCatalogItems(catalogId): Promise<Item[]>
```

Requirements for the generators:

- **Deterministic-ish but varied.** Each call produces randomized values, but the generator must always return a *valid* shape (no `undefined` fields, arrays never `null`).
- `mockFetchPublicCatalog(catalogId)` returns a `Catalog` whose `_id` is the passed `catalogId`. `payOptions` and `deliveryType` are non-empty random subsets of the literal unions in the type. `alias`, `welcomeText`, `description`, `location` are short Spanish strings picked from small in-file arrays.
- `mockFetchCatalogItems(catalogId)` returns between 4 and 12 `Item` objects. Each item's `catalogId` is the passed `catalogId`. `price` is an integer between 50 and 2000. `stock` is between 0 and 30. `imgPath` should be a working placeholder URL (use `https://picsum.photos/seed/<randomId>/600/800` so heights vary — this exercises the `columns-2` masonry rule). `updatedOn` is `new Date().toISOString()`.
- Both functions return via `Promise.resolve(...)` so callers continue to `await` them. Do **not** add artificial `setTimeout` delays.
- No external dependencies. Use only built-ins and `Math.random`.

#### 3. Branch the actions on the flag

For each of the two existing action files, keep the real fetch path intact and add a top-of-function early return when `IS_DEV_STAGE` is true:

```ts
// fetchPublicCatalog.ts
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchPublicCatalog } from '@/mocks'

export async function fetchPublicCatalog(catalogId: string): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockFetchPublicCatalog(catalogId)
  const res = await fetch(`${BASE_URL}/catalog/${catalogId}`)
  if (!res.ok) throw new Error(`Catalog not found (${res.status})`)
  const data = await res.json()
  return data.catalog
}
```

Apply the same pattern to `fetchCatalogItems.ts` using `mockFetchCatalogItems`. Do not touch the `Catalog` / `Item` type exports, the `BASE_URL` constant, or the error messages.

#### 4. Verification checklist (do not skip)

Run these in order and only report success if all pass:

1. `npm run lint` — clean.
2. `npm run build` — type-checks and builds with no errors.
3. `npm test` — all existing tests still pass with **zero** test-file modifications.
4. `npm run dev` and load `http://localhost:5173/public/catalog/anything-here` (the id no longer needs to match a seeded value). Confirm the page renders a catalog header and a `columns-2` masonry grid of mock items with images of varying heights.

#### 5. What NOT to do

- Do not migrate any action outside `src/sections/publicCatalog/actions/`.
- Do not introduce a generic "fetcher" abstraction, HOC, or context to centralize the branching. A two-line `if (IS_DEV_STAGE)` per action is the entire pattern.
- Do not add comments explaining what the code does. The only acceptable comment is a single-line note inside `src/lib/stage.ts` if the env var name is non-obvious.
- Do not edit `CLAUDE.md`, this design file, or any test.

---

## Drift notes (added 2026-06-11)

- **Step 4 verification URL is stale.** It says load `http://localhost:5173/public/catalog/anything-here`, but the public catalog route was later changed to `/catalog/:catalogId`. Use `http://localhost:5173/catalog/6a0365fdf74fdcb617a8a5b6` (or any string) for dev-stage verification.
- **Mock scope has grown beyond the original two actions.** `feature.EditCatalogView.md` added `mockFetchEditableCatalog`, `mockUpdateCatalog`, `mockUpdateItem`, `mockCreateItem`. The same two-line `if (IS_DEV_STAGE)` pattern is followed in every new action — keep it that way.
- **CLAUDE.md now documents the dev-stage rules** under "Development stage" — that section is the canonical reference; this file is the original design record.
