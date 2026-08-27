# Refactor the Share Action
When a catalog owner clicks on "compartir" the generated URL points to the current catalog, but we want to replace it to /join?catalogId={catalogId}.

This ensures a smoother navigation. The UI is already set to render the new route. we just need to re do the share URL.