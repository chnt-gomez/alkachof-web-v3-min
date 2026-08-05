## Remove Item Details
The Item object is used to display information from a catalog item
See @fetchCatalogItems.ts

We want to make a simpler navigation by removing the Sizes and (if applicable) any inventory related metadata, like stock or remaining.

The backend will work in moving this metadata to another model but for now we need to completely detach that information from all screens.

# Acceptance Criteria
1. Sizes (Talla) and all related information to that metadata should be removed from all screen
2. When created, the API will no longer require this information so it should not show in the "New product" modal