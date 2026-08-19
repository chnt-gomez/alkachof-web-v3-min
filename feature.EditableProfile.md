# Profile Screen
The profile screen can now be edited by it's owner.
Secured and reaady, the profile CRUD operations are ready in the backend. We will implement a simple (Like the Catalog Screen) but effective way to edit the fields in a Profile.

## Technical details
Profile always exist but it can be updated using a picture using the final user's native support (camera or gallery app):

# Profile API — usage guide

Everything a client needs to read and write a user profile. Base path: `/profile` (mounted in `app.js`). All endpoints require `Authorization: Bearer <jwt>`.

Stack: `api/routes/profileRoutes.js` → `api/controller/profileController.js` → `api/services/profileService.js` → `api/repositories/profileRepository.js` → `api/models/profileSchema.js`.

---

## 1. What "CRUD" means here

| Operation | Endpoint | Notes |
|---|---|---|
| **C**reate | *none* | A profile is created automatically, empty, during signup (`userService` calls `profileService.createEmptyProfile` inside the signup transaction). There is no public create endpoint and clients must never need one. |
| **R**ead | `GET /profile`, `GET /profile/{profileId}`, `GET /profile/summaries` | Own profile, any profile by id, batch public summaries. |
| **U**pdate | `POST /profile/{profileId}/update`, `POST /profile/{profileId}/image` | Text fields and picture are two separate calls (different content types). |
| **D**elete | *none* | Profiles live as long as the user. Deactivation happens on the `User`, not the profile. |

So the practical surface is **3 reads + 2 writes**. One profile per user, keyed by `userId`.

---

## 2. The Profile object

```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e4",
  "userId": "64a1b2c3d4e5f6a7b8c9d0e0",
  "profileDescription": "Seller of handmade goods",
  "alias": "artisan_mx",
  "phoneCountry": "+52",
  "phoneContact": "5512345678",
  "profile_picture_url": "http://localhost:3001/img/file_1723996800000.jpg"
}
```

Only `userId` is required by the schema; everything else is optional and starts as `''`.

> **Removed:** `phoneValidation` no longer exists on the profile. Phone verification gets its own schema in a later epic — do not send or read the field. It is stripped by Mongoose strict mode, so a client that still sends it gets a 200 and the value is silently discarded.

Note the field name inconsistency: the full profile exposes `profile_picture_url` (snake_case), while the summary shape exposes `profilePictureUrl` (camelCase). That is deliberate in the code, not a typo — the summary is a separate serializer.

### ProfileSummary (public display shape)

```json
{ "userId": "…", "alias": "artisan_mx", "profilePictureUrl": "https://…" }
```

`toProfileSummary` in `profileService` deliberately exposes only name + picture — never phone, description, or email. Use this anywhere you render another user (chat counterparty, transaction counterparty, catalog owner).

---

## 3. Endpoints

### 3.1 `GET /profile` — own profile

Resolved from the JWT (`req.userData.userId`), not from a path param.

```bash
curl -s http://localhost:3001/profile \
  -H "Authorization: Bearer $TOKEN"
```

```json
{ "profile": { "_id": "…", "userId": "…", "alias": "", … } }
```

Returns `{ "profile": null }` (200) if the user somehow has no profile row — handle the null, don't assume.

**This is the call that gives a client its own `profileId`**, which every write below needs. Cache it after login.

---

### 3.2 `GET /profile/{profileId}` — a profile by id

```bash
curl -s http://localhost:3001/profile/64a1b2c3d4e5f6a7b8c9d0e4 \
  -H "Authorization: Bearer $TOKEN"
```

Any authenticated user may read any profile, and the response is the **full** profile — including `phoneContact`. If you are rendering a stranger, prefer `/profile/summaries`.

A malformed id produces a Mongoose CastError → **500**, not 400. A well-formed but unknown id returns `{ "profile": null }` with 200.

---

### 3.3 `GET /profile/summaries?userIds=a,b,c` — batch public lookup

The N+1 killer: resolve many display names in one round-trip.

```bash
curl -s "http://localhost:3001/profile/summaries?userIds=64a1…e0,64a1…e1" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{ "summaries": [ { "userId": "…", "alias": "artisan_mx", "profilePictureUrl": "" } ] }
```

Rules worth knowing:

- **Max 100 ids per call** (`MAX_SUMMARY_IDS` in the controller). Extra ids are silently truncated, not rejected — chunk client-side if you have more.
- Invalid ids are **dropped**, never an error.
- Users without a profile simply **do not appear** in the array. The result is not index-aligned with your input — match on `userId` and render a fallback for misses.
- Empty/absent `userIds` → `{ "summaries": [] }`, 200.

Route order matters: `/summaries` is registered **before** `/:profileId` in `profileRoutes.js`. Keep it that way or Express matches `summaries` as an id.

---

### 3.4 `POST /profile/{profileId}/update` — text fields

Owner-only (`authenticateToken` + `authorizeProfileOwner`). JSON body, all fields optional:

```bash
curl -s -X POST http://localhost:3001/profile/64a1b2c3d4e5f6a7b8c9d0e4/update \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "alias": "artisan_mx", "profileDescription": "Handmade goods", "phoneCountry": "+52", "phoneContact": "5512345678" }'
```

Returns `200 { "profile": { …updated… } }`.

**Partial updates are safe — but only in one direction.** `profileRepository.update` merges with `data.field || profile.field`, so:

- Sending `{ "alias": "x" }` alone will **not** wipe the other fields. ✅
- Sending `{ "profileDescription": "" }` will **not** clear the description — `''` is falsy, so the old value survives. ❌

There is currently **no way to clear a text field back to empty** through this endpoint. If a client needs "remove my description", that requires changing the repository merge to a `!== undefined` check (and matching tests). Don't work around it by sending `" "`.

Don't send `userId`: the repository merge would accept it and reassign the profile to another user. It is not in the `UpdateProfileRequest` swagger schema — treat that schema as the contract for what this endpoint accepts.

---

### 3.5 `POST /profile/{profileId}/image` — profile picture

Owner-only. **`multipart/form-data`**, field name `image`:

```bash
curl -s -X POST http://localhost:3001/profile/64a1b2c3d4e5f6a7b8c9d0e4/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@./avatar.jpg"
```

```json
{ "profile": { "…": "…", "profile_picture_url": "http://localhost:3001/img/file_1723996800000.jpg" } }
```

- Accepted types: **JPEG / PNG only**; max **10 MB** (`api/util/storageFactory.js`). A rejected type surfaces as a multer error through the global handler (500).
- Do **not** set `Content-Type` manually in fetch/axios — let the browser set the multipart boundary.
- The controller turns the uploaded file into a public URL (`getPublicImageUrl`); the service only persists it. Storage backend is env-driven: `FILE_STORAGE=local` (served from `/img/…`) or `sevalla` (S3-compatible).
- **Posting with no file is a no-op, not an error**: `req.file` is undefined → `undefined` → the service keeps the existing picture and returns 200. There is no "remove my picture" operation.
- The old image is **not** deleted from storage when replaced. Orphaned files accumulate; that's a known MVP gap (the previous implementation deleted them, the current one doesn't).

Browser example:

```js
const body = new FormData();
body.append('image', file);
await fetch(`/profile/${profileId}/image`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }, // no Content-Type
  body
});
```

---

## 4. Errors

The global handler in `app.js` returns:

```json
{ "error": { "message": "Profile not found" } }
```

Note the **nested** `error.message` — not a top-level `message`. (Middleware rejections are the exception: `authenticateToken` and `authorizeProfileOwner` return a flat `{ "message": "Auth failed" }`.)

| Status | When |
|---|---|
| 401 | Missing/expired token, or user status ≠ `active` |
| 403 | Authenticated but not the profile owner (write routes only) |
| 500 | "Profile not found" on a write, malformed ObjectId on `GET /:profileId`, rejected image type |

There is **no 404 anywhere in this API surface**. A write against an unknown `profileId` throws from the service and lands as a 500, and a read of an unknown id returns `null` with a 200. Client code should branch on `profile == null`, not on status codes.

---

## 5. Typical client flow

```js
// 1. after login — get own profile and keep the id
const { profile } = await api.get('/profile');
const profileId = profile._id;

// 2. edit text fields (send only what changed; empty strings won't clear)
await api.post(`/profile/${profileId}/update`, { alias: 'artisan_mx' });

// 3. upload a picture separately (multipart)
await api.postForm(`/profile/${profileId}/image`, { image: file });

// 4. render other people — batch, never per-user
const ids = messages.map(m => m.sender);
const { summaries } = await api.get('/profile/summaries', { params: { userIds: ids.join(',') } });
const byUser = new Map(summaries.map(s => [s.userId, s]));
const display = id => byUser.get(id)?.alias || 'Usuario';   // fallback for misses
```

---

## 6. Known defect — the write routes currently always 403

`authorizeService.authorizeProfileOwner` (`api/services/authorizeService.js:66`) calls `profileService.getProfileById(profileId)`, but `profileService` exports **`getProfile`** — there is no `getProfileById`. At runtime the call throws `TypeError: profileService.getProfileById is not a function`, the middleware's `catch` converts it to a 403, and **both `/update` and `/image` fail for the legitimate owner** with:

```json
{ "message": "profileService.getProfileById is not a function" }
```

The unit tests don't catch this because `test/unit/routes/profileRoute.test.js` stubs `authorizeService.authorizeProfileOwner` wholesale. The fix is one word (`getProfileById` → `getProfile`), plus a service-level test of `authorizeProfileOwner` that doesn't stub the service away.

Until that lands, treat sections 3.4 and 3.5 as the intended contract rather than the observed behaviour.

---

## 7. Other gaps worth knowing

- **No field validation.** `alias` uniqueness, phone format, and description length are all unchecked. Anything the client sends is stored verbatim.
- **Phone verification lives elsewhere now.** `phoneValidation` was dropped from the profile schema (see §2); nothing in the API sets or reports a phone as verified until that epic lands. Documents written before the removal may still carry a stale `phoneValidation` key in Mongo — it is invisible to the API and safe to leave, or clear with `db.profiles.updateMany({}, { $unset: { phoneValidation: "" } })`.
- **Uploaded profile pictures land under the `products/` key prefix** on Sevalla, and local filenames are built from `req.params.itemId` (undefined here, so they become `file_<timestamp>.jpg`). Cosmetic — `storageFactory` was written for items and reused as-is.
- **Full profiles expose `phoneContact` to any authenticated user.** If contact details should be private until a transaction exists, that gate does not exist yet — use `/summaries` for third-party rendering in the meantime.
