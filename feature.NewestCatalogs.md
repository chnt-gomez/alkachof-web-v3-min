# Newest catalogs
The backend team has finished the implementation of the logic behind a new API call. Newest catalogs would allow us to see recent catalogs added to the framework.

## Technical Details
We would like a list of the newest catalogs on the home screen — the "Mis cosas" panel Inicio lands on — as the last block on it, below the news.
The API returns each row with the name, image and creation date a card needs, so one call is the whole list — there is no follow-up read per catalog. The response is cached once we get it back.
There is a secondary API endpoint to check the date of the updated list of catalogs. We check that first instead of fetching the catalogs all the time, the same way the cache strategy works on other UI actions.

The backend team has produced the follow up document: docs.NewestCatalogs.frontend.md