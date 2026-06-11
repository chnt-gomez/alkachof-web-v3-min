## Edit Catalog view.
Right now catalog view shows a bad example of how the items would show up for thr owner of the catalog.

We will expand this view to contain the following:

- All editable elements of the Catalog. See the Catalog data type to check what can be editer.
- All products of the catalog.

# Acceptance criteria.

1. Edit Product Modal: User can click on an existent product and it will show a modal with all editable information available. The user should be able to change the picture of the product by clicking on the picture. A modal should show up and let the user choose a picture from the gallery or use resources in the phone like a camera.

2. Add product Modal: User can click on a button to add a new product. Similar to the Edit Product Modal, the user should be able to pick a photo from the gallery.

3. See catalog button. It should link to the public catalog view using the catalog's id.

# Task:
Make an execution plan for this and wait for instructions

---

## Implementation log (shipped 2026-06-11)

### Route
- `/edit/catalog` → `/edit/catalog/:catalogId` in `src/router/AppRouter.tsx`.
- Test URL in dev stage: `http://localhost:5173/edit/catalog/6a0365fdf74fdcb617a8a5b6`.

### Data layer
Types `Catalog` and `Item` are reused from `src/sections/publicCatalog/actions/` — not redeclared.

| Action (`src/sections/catalog/actions/`) | Mock (`src/mocks/`) | Purpose |
|---|---|---|
| `fetchEditableCatalog.ts` | `mockFetchEditableCatalog.ts` | Load catalog by id |
| `updateCatalog.ts` | `mockUpdateCatalog.ts` | Patch catalog metadata |
| `updateItem.ts` | `mockUpdateItem.ts` | Patch a single product |
| `createItem.ts` | `mockCreateItem.ts` | Create a product (returns generated `_id` + `updatedOn`) |

All actions branch on `IS_DEV_STAGE`. All four mocks re-exported from `src/mocks/index.ts`.

### Context
`src/sections/catalog/context/EditCatalogContext.tsx` — `EditCatalogProvider({ catalogId })` exposes `{ catalog, items, isLoading, error, updateCatalog, updateItem, createItem }` via `useEditCatalog()`. Fetches catalog + items in parallel on mount; mutations update local state in place (no refetch).

### Components (`src/sections/catalog/components/`)
- `CatalogHeader.tsx` — jumbotron with pencil button (→ `EditCatalogModal`) and `Ver catálogo` link → `/catalog/:catalogId`.
- `EditCatalogModal.tsx` — full catalog form (alias, welcomeText, description, location, locationZip, payOptions, deliveryType).
- `ProductGrid.tsx` — `columns-2` masonry + `Agregar producto` button.
- `EditProductModal.tsx` — product form; tappable image opens `ImagePickerSheet`.
- `AddProductModal.tsx` — blank product form; same image picker.
- `ImagePickerSheet.tsx` — bottom sheet with two hidden file inputs: gallery (`accept="image/*"`) and camera (`accept="image/*" capture="environment"`). Returns `URL.createObjectURL(file)` to caller.

### Page
`src/sections/catalog/CatalogPage.tsx` reads `:catalogId` from route, wraps everything in `EditCatalogProvider`, renders loading/error/content states.

### Styling addition
Added `.input` utility under `@layer components` in `src/index.css` for form inputs. First component-layer rule in the project — if more accumulate, extract to a dedicated CSS module.

### Tests
`src/sections/catalog/__tests__/CatalogPage.test.tsx` — 13 integration tests at the page level. Mocks the 4 catalog action modules + `fetchCatalogItems` from publicCatalog. All 25 project tests pass.

### Known limitations / deferred
- Price form input is in pesos (display + edit) and converted to centavos on save. The existing mock `fetchCatalogItems` generates `randomInt(50, 2000)` centavos = $0.50–$20 MXN, which is unrealistically low but is pre-existing behavior, not changed here.
- `deliveryDates` and `deliveryLocations` fields on `Catalog` are not yet exposed in `EditCatalogModal` — neither was specified in acceptance criteria.
- No delete-product action.
- Image picker stores an in-memory object URL; in production a real upload action will be needed.
- No auth context yet — `/edit/catalog/:catalogId` is publicly accessible. The dev-stage `updateCatalog` mock uses `credentials: 'include'` in the real branch as a placeholder for future auth.
