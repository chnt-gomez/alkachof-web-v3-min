# Invitation Page

We would like to create a landing page for new users. Similar to /about routing.

## Technical Details
The page should live under /join and will accept the following parameters in the GET request

- catalogId: UUID. Is the catalog that is inviting a new user to join

The page will render the image of the given catalog ID along with a the "Welcome Text".

Then a static text will always be present "{catalogAlias} te quiere invitar a Alkachof para que veas su catálogo de productos y servicios"

Then a button "Ver catálogo" to redirect to the actual public catalog page.

If the user is already loged in to Alkachof, we will replace the "Ver Catálogo" button for "Subscribirse". It will perform the suscribe actio and will be redirected to the catalog.
