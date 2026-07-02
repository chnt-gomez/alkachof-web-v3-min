# FAQ Endpoints — Frontend Handoff

Two new endpoints under `/catalog`. Both live in `api/routes/catalogRoutes.js`. Swagger UI is available at `/api-docs` in non-prod.

Auth uses the existing `Bearer <token>` scheme. `authenticateToken` currently requires the user to have `status === 'active'`, so any non-active user (banned, inactive, pending) gets **401** before endpoint-specific checks run.

---

## 1. Ask a question on a catalog

**`POST /catalog/:catalogId/ask`**

- **Auth:** required (`Authorization: Bearer <token>`)
- **Authorization:** authenticated user must not be banned (already enforced by auth middleware)
- **Who calls it:** any authenticated shopper viewing a catalog

### Request body
```json
{
  "questionText": "Do you ship internationally?"
}
```

Only `questionText` is accepted. `questionAnswer` and `flag` are **stripped by the controller** — do not send them; they are ignored on purpose (only the catalog owner can set those via the answer endpoint).

### Response — 201 Created
```json
{
  "message": "Question submitted",
  "question": {
    "id": "64a1b2c3d4e5f6a7b8c9d0f0",
    "questionText": "Do you ship internationally?",
    "questionAnswer": null,
    "userId": "64a1b2c3d4e5f6a7b8c9d0e0",
    "catalogId": "64a1b2c3d4e5f6a7b8c9d0e2",
    "flag": null,
    "createdOn": "2026-07-01T12:34:56.000Z",
    "updatedOn": "2026-07-01T12:34:56.000Z"
  }
}
```

### Error responses
| Status | When |
|---|---|
| 401 | Missing/invalid token, or user status ≠ `active` |
| 403 | User is banned (defense-in-depth; today auth catches it first) |
| 500 | `questionText` empty/whitespace, or catalog not found |

Error body shape: `{ "message": "<reason>" }`.

---

## 2. Answer or flag a question (catalog owner only)

**`POST /catalog/:catalogId/question/:questionId/answer`**

- **Auth:** required
- **Authorization:** must be the owner of `:catalogId`
- **Who calls it:** the catalog owner from their moderation view

### Request body
At least one of the two fields is required. You may send either or both:

```json
{
  "questionAnswer": "Yes, worldwide shipping is available.",
  "flag": null
}
```

- `questionAnswer` — string, or `null` to clear.
- `flag` — one of: `"inappropriate"`, `"not_a_question"`, `"not_help"`, or `null` to clear.

Any other body field is ignored. Sending an empty body returns 500 `"Nothing to update"`.

### Response — 200 OK
```json
{
  "message": "Question updated",
  "question": {
    "id": "64a1b2c3d4e5f6a7b8c9d0f0",
    "questionText": "Do you ship internationally?",
    "questionAnswer": "Yes, worldwide shipping is available.",
    "userId": "64a1b2c3d4e5f6a7b8c9d0e0",
    "catalogId": "64a1b2c3d4e5f6a7b8c9d0e2",
    "flag": null,
    "createdOn": "2026-07-01T12:34:56.000Z",
    "updatedOn": "2026-07-01T13:00:00.000Z"
  }
}
```

### Error responses
| Status | When |
|---|---|
| 401 | Missing/invalid token, or user status ≠ `active` |
| 403 | Authenticated user is not the catalog owner |
| 500 | Question not found; question does not belong to `:catalogId`; invalid flag; nothing to update |

---

## Shared model — `Question`

| Field | Type | Notes |
|---|---|---|
| `id` | string (ObjectId) | Server-assigned |
| `questionText` | string | Set once at ask time; not editable |
| `questionAnswer` | string \| null | Owner-only field |
| `userId` | string (ObjectId) | Author |
| `catalogId` | string (ObjectId) | |
| `flag` | `"inappropriate"` \| `"not_a_question"` \| `"not_help"` \| null | Owner-only field |
| `createdOn` | ISO date-time | |
| `updatedOn` | ISO date-time | Bumped on every owner update |

Questions flagged as `"inappropriate"` are filtered out of any list endpoint we add later (repository behavior — worth knowing when the FE builds a moderation UI).

---

## Notes for the FE agent

- No list/read endpoint exists yet. If the FAQ tab needs "load all questions for this catalog", flag it — the repo already has `findByCatalogId`, but no route/controller is wired.
- The `flag` field is intended for moderation, not for the asker. Do not expose it in the "ask" form. Expose it only in the owner's moderation view.
- Error messages are human-readable but not i18n keys — treat them as debug/logging text, not display copy.
