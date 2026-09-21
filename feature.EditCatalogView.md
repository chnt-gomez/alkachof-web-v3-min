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

## How it is built today

The owner's catalog editor is `/catalog` — no id in the url, the catalog is resolved from the auth
token (`src/sections/catalog/CatalogPage.tsx`). `EditCatalogProvider`
(`context/EditCatalogContext.tsx`) holds the catalog and its items; it is an adapter over the
TanStack Query entries owned by `useOwnerCatalog`, so navigating away and back costs nothing. See
*Caching* in `CLAUDE.md`.

Components under `src/sections/catalog/components/`:

- `CatalogHeader.tsx` — jumbotron, with the link through to the public view at `/catalog/:catalogId`.
- `EditCatalogScreen.tsx` — the catalog form (alias, welcome text, description, delivery and payment
  options, image).
- `ProductGrid.tsx` — `columns-2` masonry, "Agregar producto", and the Instagram import entry point.
- `ItemFormDialog.tsx` — one dialog for both create and edit, including the image field.
- `DeleteItemConfirm.tsx`, `LocationEditDialog.tsx`, `ShareCatalogDialog.tsx`, `AnnounceDialog.tsx` —
  the remaining owner actions.

Types `Catalog` and `Item` are reused from `src/sections/publicCatalog/actions/`, never redeclared.
Prices are centavos in the data and pesos in the form. Images go through `ImageUploadField` with the
`products` preset — see *Image uploads* in `CLAUDE.md`.

`src/index.css` gained the `.input` utility under `@layer components` for these forms; it is still
the only component-layer rule in the project.

Tests: `src/sections/catalog/__tests__/` covers the page by rendering it and mocking the action
modules.
