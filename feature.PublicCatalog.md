ALK 2105 PUBLIC CATALOG IMPLEMENTATION

Read if you havent the CLAUDE.md context in the root directory.

Read the api.definitions.md

We want to create a new section with it's onw layout and context provider. The Public Catalog is a new section that allows non-authenticated used to read the information of a catalog using catalog/{id} call. Right now our backend is not seeded but we want to implement the initial landing view.

We currantly have the catalog section available but that's used only for authenticated users so we dont need to touch that. 

1. Create a barebone page for public catalog
2. Create an action to fetch data from the available api