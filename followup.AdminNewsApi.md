# Follow-up: News Feed (Admin Announcements) API — Frontend Handoff

This document hands the **News** endpoints to the web client team. It mirrors the OpenAPI
definitions live in Swagger (`/api-docs`, non-prod only) so the dashboard can be built against a
stable contract.

## Summary

Admins publish **announcements** ("news"). The frontend fetches them and renders them on the
dashboard — typically as a "notifications"/updates panel. This is a **pull-based feed**:

- **No push, no real-time.** There is no socket event and no `/notification` integration for news.
  The dashboard gets fresh announcements by **calling `GET /news`** (e.g. on dashboard load, and/or
  on a poll interval). Do not expect a `notification:new` socket push for these.
- **Everyone sees the same feed.** There are no private/targeted announcements — every registered
  (authenticated) user sees every non-deleted announcement.
- **Deleted announcements are soft-deleted.** They disappear from the feed and their detail page
  returns `404`. A link to a since-deleted announcement (`/news/{id}`) will 404 — handle that.

## Base path

`/news` (mounted in `app.js`).

**Auth: every endpoint requires `Authorization: Bearer <jwt>`.** Reads only need a logged-in user;
create/update/delete additionally require the user to be an **admin** (server checks `user.type`
live in the DB — not carried in the token).

## Endpoints

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET`  | `/news` | any logged-in user | List announcements (newest first) |
| `GET`  | `/news/{adminMessageId}` | any logged-in user | Get one announcement (the `/news/{id}` detail page) |
| `POST` | `/news/create` | admin | Create an announcement |
| `POST` | `/news/{adminMessageId}/update` | admin | Edit an announcement |
| `POST` | `/news/{adminMessageId}/delete` | admin | Delete (soft) an announcement |

> Note the house convention: **mutations are `POST`**, not `PUT`/`DELETE`, and the id is in the path.

## The announcement object (response shape)

```json
{
  "_id": "6a7b5710535d8d404531e712",
  "date": "2026-08-11T17:08:32.457Z",
  "title": "New payment options",
  "message": "You can now pay with transfers."
}
```

- `date` — ISO-8601 date-time string (publication time, set by the server).
- `title`, `message` — plain strings. `message` is the announcement body; render as text.
- That's the whole shape. There is **no** image, no author, no category, no read/seen state.

## Reading the feed

### `GET /news`
```
GET /news
Authorization: Bearer <jwt>
```
**200**
```json
{
  "adminMessages": [
    { "_id": "…", "date": "2026-08-11T17:08:32.457Z", "title": "Second post", "message": "newer" },
    { "_id": "…", "date": "2026-08-10T09:00:00.000Z", "title": "First post",  "message": "older" }
  ]
}
```
- Sorted **newest first** (by `date` desc). Safe to render in array order.
- Empty feed returns `{ "adminMessages": [] }` (200, not 404).

### `GET /news/{adminMessageId}` — the detail page
```
GET /news/6a7b5710535d8d404531e712
Authorization: Bearer <jwt>
```
**200**
```json
{ "adminMessage": { "_id": "…", "date": "…", "title": "…", "message": "…" } }
```
**404** — id is unknown, malformed, or the announcement was deleted:
```json
{ "message": "Announcement not found" }
```
> A malformed id (not a valid Mongo ObjectId) returns a clean `404`, not a server error — so you
> can route `/news/:id` straight through without pre-validating the id.

## Admin-only mutations

### `POST /news/create`
```
POST /news/create
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{ "title": "New payment options", "message": "You can now pay with transfers." }
```
**201**
```json
{ "message": "Announcement created", "adminMessage": { "_id": "…", "date": "…", "title": "…", "message": "…" } }
```
**400** — `title` or `message` missing/empty: `{ "message": "title and message are required" }`

### `POST /news/{adminMessageId}/update`
Send only the fields you want to change (both optional):
```
POST /news/6a7b5710535d8d404531e712/update
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{ "title": "New payment options (updated)" }
```
**200** → `{ "message": "Announcement updated", "adminMessage": { … } }`
**404** → `{ "message": "Announcement not found" }` (missing or already deleted)

### `POST /news/{adminMessageId}/delete`
```
POST /news/6a7b5710535d8d404531e712/delete
Authorization: Bearer <admin-jwt>
```
**200** → `{ "message": "Announcement deleted" }`
**404** → `{ "message": "Announcement not found" }` (missing or already deleted)

## Status codes & error shape

Every error is `{ "message": "<text>" }`.

| Status | When | Message |
|---|---|---|
| `401` | No token / expired / user not `active` | `Auth failed` |
| `403` | Logged in but **not an admin** (on create/update/delete) | `Admin privileges required` |
| `400` | Create with missing `title`/`message` | `title and message are required` |
| `404` | Get/update/delete of an unknown, malformed, or deleted id | `Announcement not found` |

## FE integration notes

- **Gate the admin UI on `403`, not on the token.** The JWT does not tell you whether the user is
  an admin. Either attempt the admin action and handle `403`, or key admin controls off a role you
  fetch elsewhere (e.g. profile). Reads work for every logged-in user regardless.
- **Refresh strategy for the dashboard:** call `GET /news` on load; poll if you want near-real-time
  ("new announcements" badge). There is no push channel for news, so polling is the mechanism.
- **Handle the deleted-link case:** a bookmarked/deep-linked `/news/{id}` can `404` after deletion —
  show a friendly "this announcement is no longer available" rather than an error screen.
- **No pagination yet.** `GET /news` returns the full list. Fine for now; if the feed grows large
  this will be revisited (ask backend before assuming query params like `limit`/`skip` exist).

## Try it locally

Swagger UI (non-prod): **`/api-docs`** → tag **AdminMessage**. Or curl:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"…"}' | jq -r .token)

# read the feed
curl -s http://localhost:3001/news -H "Authorization: Bearer $TOKEN"

# create (admin only)
curl -s -X POST http://localhost:3001/news/create \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Hello","message":"First announcement"}'
```
