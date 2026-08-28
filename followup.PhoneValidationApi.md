# Phone Validation — frontend handoff

Account verification moved from an email link to a phone-code challenge, and password reset now
delivers a code the same way instead of an email link. This is the API-side contract for both
flows. Full engineering rationale: `CLAUDE.md` §W and `blueprint.PhoneValidation.md`.

---

## 1. Signup now requires a phone

`POST /signup` gains a required field:

```json
{ "email": "user@example.com", "password": "secret123", "phone": "5512345678" }
```

- `phone` is **exactly 10 digits**, as a string. No country field — the server always assigns `+52`
  (Mexico). Do not build a country picker; there is nothing to pick.
- **400** `{ "message": "Phone number must be 10 digits" }` for a malformed phone (wrong length,
  non-digit characters, missing, non-string).
- **409** `{ "message": "Phone number already registered" }` for a phone already on file — same
  status/shape as the existing email-taken conflict.

Nothing else about the signup response changes — the phone is never echoed back.

---

## 2. After signup: verify the phone

Signup no longer sends a verification email. Immediately after a successful signup, show a
"enter the code we sent you" screen and drive these two endpoints (both pre-login — no
`Authorization` header):

### `POST /phone/verify`

```json
{ "code": "a3f9c2b81d04" }
```

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ "message": "Phone verified" }` | Account is now active — proceed to login |
| 400 | `{ "message": "Verification code is required" }` | Empty/missing code |
| 400 | `{ "message": "Invalid token" }` | Code doesn't exist / already used |
| 400 | `{ "message": "Token expired" }` | Code is older than 24h |
| 500 | — | Rare: the token was valid but the account was already active or banned (a benign double-submit lands here too — treat any 500 on this endpoint as "something went wrong, try resending") |

**Build a plain text input, not a 6-box numeric OTP widget.** The code is a **12-character hex
string** (e.g. `a3f9c2b81d04`), not a 6-digit number — a fixed-width numeric OTP UI will not fit it
and will look broken.

### `POST /phone/resend`

```json
{ "email": "user@example.com" }
```

Always returns `200 { "message": "Verification code sent" }` — including for an email the server
doesn't recognize (this is intentional, not a bug; it mirrors the login-enumeration protection
elsewhere in the API). Only a missing/non-string `email` gets a 400.

### Where the code actually is, right now

**There is no SMS provider wired yet.** The code is currently only written to the server's debug
log (`NODE_ENV` other than `prod`) — nothing is texted to the phone during this phase. For
integration testing, ask the API team to tail the server log around signup/resend calls. This also
means: **a phone-validated signup cannot be completed against a production deployment yet** — flag
this before this ships anywhere beyond a dev/staging environment.

---

## 3. Password reset now delivers a code by phone, not a link by email — page rewrite required

This is the bigger change. `ResetPasswordPage.tsx` (or equivalent) is currently built around an
**email link**:

- it reads the token from the route (`useParams`) — there's no field for the user to type into;
- on mount it calls `GET /validate/:token` to pre-check the link and shows "invalid" if that fails.

**Both assumptions are gone.** The new flow:

1. `POST /recover { email }` — unchanged request/response shape. Always 200, non-enumerating.
   A code is now sent to the phone on file instead of a link by email (same "log only, no real SMS
   yet" caveat as above — see the API team's log for the code during testing).
2. Show a form with **two fields**: the code (plain text, 12-char hex — not an OTP widget) and the
   new password.
3. `POST /reset { token, password }` — **`token` is now the code the user types**, not a value
   pulled from a URL. Request/response shape is otherwise identical to before.

**Delete the on-mount pre-check.** There is nothing to validate before the user has typed a code,
and `/reset` already reports an invalid/expired code on submit. (This pre-check was actually
calling the wrong endpoint already — `GET /validate/:token` checks signup tokens, not recovery
tokens, so it could never have validated a real recovery link. Removing it fixes a live bug as a
side effect, not just a UX simplification.)

`POST /reset` error shapes are unchanged:

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ "message": "Password updated" }` | Success |
| 500 | `"Invalid token"` / `"Token expired"` | Bad or stale code — these are currently 500s, not 400s; handle them as "show an error and let the user request a new code" regardless of status code |

---

## 4. The breaking half: profile phone fields are gone

`phoneCountry` and `phoneContact` no longer exist anywhere in the API — not on `GET /profile`, not
accepted by `POST /profile/{profileId}/update`. There is **no replacement read endpoint** — phone
is intentionally not exposed over HTTP outside of the signup/verify/resend/recover/reset flows
above.

Concretely, in `alkachof-web-v3-min`:

- **`ProfilePage.tsx`** (around line 28) renders `[profile.phoneCountry, profile.phoneContact].join(' ')` —
  remove this line/field from the rendered profile.
- **`EditProfileScreen.tsx`** (around lines 37-41, 101, 109) binds two inputs to these fields and
  includes them in the submitted patch — remove both inputs.
- **`updateProfile.ts`** (around line 13) includes both fields in its patch type — remove them.

**This is not cosmetic — it is a silent failure mode.** The edit form will keep submitting these
fields until the above ships; the server strips them silently (mongoose strict mode) and answers
200, so a user editing their phone from the profile screen sees a successful save that actually
changed nothing. There is a real window between this API shipping and the frontend PR landing where
this is user-visible — coordinate the two merges if that window matters.

---

## 5. Quick reference — status codes

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /signup` | none | now requires `phone`; 400 `INVALID_PHONE`, 409 `PHONE_ALREADY_EXISTS` added |
| `POST /phone/verify` | none | `{ code }` → 200/400 |
| `POST /phone/resend` | none | `{ email }` → always 200 (except 400 on missing email) |
| `POST /recover` | none | unchanged shape; now sends a phone code instead of an email link |
| `POST /reset` | none | unchanged shape; `token` is now a typed code, not a URL param |
| `GET /profile`, `POST /profile/{id}/update` | as before | `phoneCountry`/`phoneContact` no longer read or written |
