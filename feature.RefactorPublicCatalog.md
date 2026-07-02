Take a look at CLAUDE.ms and get the project context if you haven't

Requirement: Public Catalog is a work in progress and it neeeds a couple of re-factors:

1. Add a button to Subscribe to the catalog. The button functionality should be left to an empty 'handleSubscribe()' function as a placeholder. Ideally the button should remain inside the Jumbotron of the PublicCatalogPage.
2. Reformat product showcase grid.
 2.2 The images should display as possible following the following rules: Shrink keeping aspect ratio. Never stretch an image to fit.
 Images should fit horizontally and adjust vertically so we are able to show as much as possible. The following is a copy of an outdated version that managed to display images properly:

 ```javascript
 <TableRow
      hover
      selected={selected}
      onClick={handleEdit}
      sx={{ cursor: 'pointer' }}
    >
      <TableCell sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box
            component="img"
            src={imgPath}
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              mr: 1,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="subtitle2"
            sx={{
              maxWidth: 240,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              ml: 1,
              flexGrow: 1,
              display: { xs: 'block', sm: 'block' },
            }}
          >
            {name}
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              ml: 2,
              flexShrink: 0,
              textAlign: 'right',
              minWidth: 60,
            }}
          >
            {fCurrencyCents(price)}
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
```

3. Product Details Dialog. Add a Component for a pop up dialog. The Dialog should enlarge and show the complete image and allow the user to see all of the product details

## NOTES ##

Images are the most important component of the application. Our customers value the simplicity and it's the only marketing channel available for them. NEVER STRECTH OR EDIT THE RATIO OF IMAGES IN ORDER TO FIT THE UI.

---

## Drift notes (added 2026-06-11)

- **All three requirements shipped:** `Suscribirme` button in `CatalogJumbotron`, masonry `columns-2` grid in `CatalogItemList`, and `ProductDetailDialog` with `object-contain` enlarged image.
- **Image-display rules were promoted to CLAUDE.md** under "Golden rules → Image display" (no `object-cover`, no fixed image heights, `max-h-[90vh] overflow-y-auto` on dialogs). That section is now the canonical rule; this file is the original requirement.
- **`handleSubscribe()` is still a placeholder** in `CatalogJumbotron.tsx`. Wire it up when the subscription action lands.
