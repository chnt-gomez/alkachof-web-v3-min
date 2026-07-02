ALK 2105 PUBLIC CATALOG IMPLEMENTATION

Read if you havent the CLAUDE.md context in the root directory.

Read the api.definitions.md

We want to create a new section with it's onw layout and context provider. The Public Catalog is a new section that allows non-authenticated used to read the information of a catalog using catalog/{id} call. Right now our backend is not seeded but we want to implement the initial landing view.

We currantly have the catalog section available but that's used only for authenticated users so we dont need to touch that. 

1. Create a barebone page for public catalog
2. Create an action to fetch data from the available api

---

## Drift notes (added 2026-06-11)

- **`api.definitions.md` does not exist in the repo.** This file references it but no such doc was ever committed. If you need the API shape, read the `Catalog` and `Item` types in `src/sections/publicCatalog/actions/`.
- **Route is `/catalog/:catalogId`**, not `catalog/{id}` as worded above. Public catalog page lives at `src/sections/publicCatalog/PublicCatalogPage.tsx`.
- **Ticket label `ALK-2105` is also used by `feature.developmentStage.md`** — likely a parent ticket split, not duplicates.
- **Implementation shipped:** `PublicCatalogPage`, `CatalogJumbotron`, `CatalogItemList`, `ProductDetailDialog`, `PublicCatalogContext`, actions `fetchPublicCatalog` + `fetchCatalogItems`. See `feature.RefactorPublicCatalog.md` for follow-up changes.