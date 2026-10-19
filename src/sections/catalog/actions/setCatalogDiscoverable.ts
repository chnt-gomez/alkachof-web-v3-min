import { api, ApiError } from '@/lib/api'
import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'

/**
 * Puts the catalog on `/map`, or takes it off. Owner-only.
 * Contract: `docs.OptInMapDiscoverable.frontend.md`.
 *
 * `POST /location/:locationId/discoverable` is the **only** way to write this
 * flag: the API refuses the key on create and ignores it on
 * `/location/:id/update`. That is deliberate on both sides — `/update` is the
 * address form's endpoint and a form posts every field it holds, so a flag
 * reachable from there would be cleared whenever a seller corrected their
 * street, answering 200 on the way out. Keeping it off `LocationInput` is this
 * client's half of that bargain: no address body can carry it.
 *
 * Shaped like `uploadCatalogImage` — an immediate write beside the editor's
 * deferred field form, answering with the row to put in the cache.
 */
export async function setCatalogDiscoverable(
  locationId: string,
  isDiscoverable: boolean,
): Promise<CatalogLocation> {
  const data = await api<{ location: CatalogLocation }>(`/location/${locationId}/discoverable`, {
    method: 'POST',
    body: { is_discoverable: isDiscoverable },
  })
  return data.location
}

/**
 * True when the API refused because the catalog has no indexable point yet.
 *
 * **Keyed off the status, never the message.** Every string this API returns is
 * English ("A location with valid coordinates is required…") and this is one a
 * seller would read, so the status is the part of the contract we build on and
 * the message is for the console. Same rule as `isCodeDestroyedError`.
 *
 * It is a 409 rather than a 400 because the request was well formed — there is
 * nothing in the body to correct, the row is simply not ready.
 */
export function isMissingLocationError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409
}
