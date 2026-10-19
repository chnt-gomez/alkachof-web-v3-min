# Local Caching.

We have been measuring the inputs of Alkachof and there are many areas of opportunity to explore how to reduce significantly the number of API calls made to the backend service.

## Opportunities

1. Private Catalog metadata. -> After anu CRUD operation on the Catalog data, the Information could be stored on a cache to prevent loading it.
2. Private Catalog Items metadata -> After any CRUD operation, the catalog items data could be stored on a cache to prevent loading it.
3. User Profile -> After any CRID operation, the user's profile could be stored on a cache

## Technicall approach. 
Prefered stack: Tanstack Query