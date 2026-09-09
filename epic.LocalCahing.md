# Local Caching.

We have been measuring the inputs of Alkachof and there are many areas of opportunity to explore how to reduce significantly the number of API calls made to the backend service.

## Opportunities

1. Instagram Import lock. -> After a succesfull import, save the available date to a cookie or use TanStackQuery to cache the available date to prevent calling multiple times.
2. Private Catalog metadata. -> After anu CRUD operation on the Catalog data, the Information could be stored on a cache to prevent loading it.
3. Private Catalog Items metadata -> After any CRUD operation, the catalog items data could be stored on a cache to prevent loading it.
4. User Profile -> After any CRID operation, the user's profile could be stored on a cache

## Technicall approach. 
Prefered stack: Tanstack Query