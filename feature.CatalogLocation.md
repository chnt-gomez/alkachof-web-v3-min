## Context
Catalog location is now available at the backend. Providing additional information about the location of a catalog, instead of a flat string.

# New Requirements
1. Read followup.CatalogLocationApi.md in the root directory to understand the usage of the api
2. The Public Catalog screen must now have a new card to portrait the location in a map. The Card should estimate the distance from the curren user location to the actual catalog location.
3. The Edit Catalog modal should be entirely replaced with a fullscreen feature that allows to edit the catalog. A Button should open a modal to update the Catalog location.
4. If the catalog does not have a valid location ID or the location ID fails to fetch the metadata, the map card should not be drawn in the public catalog screen.