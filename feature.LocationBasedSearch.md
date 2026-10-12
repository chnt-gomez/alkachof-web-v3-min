# New Feature
We will allow users to search on a map screen for available catalogs. While the backend team is finishing up the api we will start
with a map screen under "Comprar" tab.

Originally this tab would show only the calatogs that the user already subscribed to previously, but now we need to show an additional option. It will show as a card on top of the subscriptions list with a map Icon. "Buscar Catalogos" "Busca catalogos cerca de ti con el mapa". This will open up a big screen map showing the user's current position.

## Constraints.
The backend is not ready so there is no point in creating the aciton list.

## Acceptance criteria
- On the "Comprar" screen, a new card shows with a map icon and the folllwing title "Buscar Catálogos" and the description "Busca catalogos cerda de ti con el mapa"
- The new card redirects to a new fullscreen map, showing the user current location
- Although there is no backend yet configured, the screen should contain a search bar and the map should allow to move and zoom out up to a certain distance. (To prevent abusive api calls).
- Map should contain a usable button to return to user location.