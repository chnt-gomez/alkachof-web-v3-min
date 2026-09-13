# Phone Validation — frontend handoff

Account verification is a phone-code challenge, and password reset delivers a code the same way.
This is the API-side contract for both flows. Full engineering rationale: `CLAUDE.md` §W and
`blueprint.PhoneValidation.md`.

> **Revision 2 — breaking.** The verification code changed shape (12-char hex → **6 numeric
> digits**), both challenge endpoints now **require `email`**, a code is **destroyed after 5 wrong
> attempts**, and `GET /validate/:token` **no longer exists**. §0 is the route/schema reference,
> §§1–4 the behavioural delta, §5b the types to copy, §§5–7 what did not change. The web client
> already implements revision 1, so this is a small, surgical set of edits — not a rewrite.

---

## 0. Routes and schemas

Everything below is live in the OpenAPI spec — browse it at **`/api-docs`** (any environment where
`NODE_ENV !== 'prod'`). Schema names are given so you can cross-reference or generate types.

| Route | Method | Request schema | Success | Limiter |
|---|---|---|---|---|
| `/signup` | POST | `SignupRequest` | 201 `SignupResponse` | `emailLimiter` — 5/hr |
| `/phone/verify` | POST | **`PhoneVerifyRequest`** | 200 `{ message }` | `authLimiter` — 10 failures/15 min |
| `/phone/resend` | POST | `PhoneResendRequest` | 200 `{ message }` | `emailLimiter` — 5/hr |
| `/recover` | POST | `RecoverPasswordRequest` | 200 `{ message, email }` | `emailLimiter` — 5/hr |
| `/reset` | POST | **`ResetPasswordRequest`** | 200 `{ message }` | `authLimiter` — 10 failures/15 min |
| ~~`/validate/{token}`~~ | ~~GET~~ | — | **deleted — 404** | — |

All five are **pre-login**: no `Authorization` header, `authenticated: false` on the api helper.

The two schemas in bold changed in this revision (both gained a required `email`); the rest are
unchanged. Verbatim from the spec:

```jsonc
// PhoneVerifyRequest       required: email, code
{ "email": "newuser@example.com", "code": "043532" }

// ResetPasswordRequest     required: email, token, password
{ "email": "user@example.com", "token": "043532", "password": "newSecret123" }

// SignupRequest            required: email, password, phone
{ "email": "newuser@example.com", "password": "secret123", "phone": "5512345678" }

// PhoneResendRequest / RecoverPasswordRequest    required: email
{ "email": "user@example.com" }

// SignupResponse (201)
{ "message": "User created",
  "user": { "email": "...", "status": "pending-registration", "created": "2026-08-29T06:06:35.213Z" } }
```

### Two error envelopes — this one bites

The API returns errors in **two different shapes**, and `ErrorResponse` in the spec only documents
the second one:

```jsonc
// A) Rejected by the controller — FLAT. Every 400 in this document.
{ "message": "Invalid token" }
{ "message": "Too many incorrect attempts. Request a new code.", "codeDestroyed": true }
{ "message": "Too many requests, please try again later", "availableAt": "2026-08-29T04:38:51.399Z" }

// B) Reached the global error handler — NESTED under `error`. This is `ErrorResponse`.
{ "error": { "message": "Error activating user" } }                 // 500
{ "error": { "message": "Expected property name or '}' in JSON…" } } // 400 — malformed body
```

**Do not infer the envelope from the status code.** Shape B is not "the 5xx shape" — a malformed
JSON body returns B with a 400. Read both, in this order:

```ts
const message = data?.error?.message ?? data?.message
```

`src/lib/api.ts` → `readError` **already does exactly this**, so `ApiError.message` is correct today
and needs no change. The reason to know about it: `codeDestroyed` only ever appears in shape A, so
read it off `ApiError.body` (§4) and never try to pull it out of a nested `error` object.

---

## 1. Why this changed (read this before deciding how to handle errors)

The code went from a 12-character hex string to 6 digits so it can be read off a lock screen and
typed. That shortens it from ~48 bits to ~20, which is only safe because of two new server-side
controls — and **one of them is visible in your error handling**:

1. **Every code is checked against one account.** That is why `email` is now required on
   `/phone/verify` and `/reset`. A code that is valid for account A is rejected for account B.
2. **A code is destroyed after 5 wrong attempts.** The 6th response is not "wrong code" — the code
   no longer exists, and the user *must* request a new one. Telling them to retype is a dead end,
   which is why the API flags this case explicitly (§4).

---

## 2. `POST /phone/verify` — now takes `email`

```diff
- { "code": "a3f9c2b81d04" }
+ { "email": "user@example.com", "code": "043532" }
```

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ "message": "Phone verified" }` | Account is active — proceed to login |
| 400 | `{ "message": "Email is required" }` | Missing/non-string email |
| 400 | `{ "message": "Verification code is required" }` | Missing/empty code |
| 400 | `{ "message": "Invalid token" }` | Wrong code, no code pending, or unknown email |
| 400 | `{ "message": "Token expired" }` | Correct code, but older than 24h |
| 400 | `{ "message": "Too many incorrect attempts. Request a new code.", "codeDestroyed": true }` | **Code destroyed — see §4** |
| 429 | `{ "message": "Too many requests...", "availableAt": "…" }` | IP rate limit (10 failures / 15 min) |
| 500 | `{ "error": { "message": "Error activating user" } }` | Valid code, but the account cannot be activated (banned). Rare — see below |

`"Invalid token"` is deliberately the single answer to *wrong code*, *no code pending* and *unknown
email* — do not try to tell them apart, and do not surface the difference in copy.

> **Correction to revision 1 of this document:** it said a double-submit lands on a 500. It no longer
> does. A successful verify **consumes** the code, so submitting the same code twice finds nothing
> and returns a plain `400 "Invalid token"` — verified against a running server. The remaining 500 is
> genuinely rare (a live code whose account is banned) and uses envelope **B**. Treat any 500 here as
> "algo salió mal, solicita un código nuevo"; there is no user-actionable difference.

### Code input

The code is **always exactly 6 digits, including leading zeros** (`043532` is a real code — never
trim or parse it to a number). A 6-box numeric OTP widget is now the right control. At minimum,
change the existing input:

```diff
  <Input
    id="code"
    type="text"
+   inputMode="numeric"
+   pattern="\d{6}"
+   maxLength={6}
    autoComplete="one-time-code"
-   placeholder="a3f9c2b81d04"
+   placeholder="000000"
```

`autoComplete="one-time-code"` is already correct and is worth keeping — iOS will now actually
offer the SMS code, since it is a plain 6-digit number.

---

## 3. `POST /reset` — now takes `email`

```diff
- { "token": "a3f9c2b81d04", "password": "newSecret123" }
+ { "email": "user@example.com", "token": "043532", "password": "newSecret123" }
```

The field is still named `token` (not `code`) — unchanged, to keep this diff small.

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ "message": "Password updated" }` | Success |
| 400 | `{ "message": "Email is required" }` / `{ "message": "Verification code is required" }` | Missing field |
| 400 | `{ "message": "Invalid token" }` / `{ "message": "Token expired" }` | Bad or stale code |
| 400 | `{ "message": "Too many incorrect attempts. Request a new code.", "codeDestroyed": true }` | **Code destroyed — see §4** |
| 429 | `{ "message": "Too many requests...", "availableAt": "…" }` | IP rate limit |

> **These are now 400s, not 500s.** Revision 1 of this document told you to handle `"Invalid token"`
> and `"Token expired"` "regardless of status code" because `/reset` returned 500 for them. That is
> fixed — a caller mistyping their code is no longer reported as a server fault. If any code branches
> on 500 here, it is now dead.

### `ResetPasswordPage` needs an email field

The page currently collects **code + password + confirm** and no email. Add an email input, and
prefill it from `RecoverPage` so the common path stays one field shorter:

```diff
// RecoverPage.tsx — the success card
- <Link to="/reset">
+ <Link to="/reset" state={{ email }}>
    <Button className="w-full">Ingresar código</Button>
  </Link>
```

```diff
// ResetPasswordPage.tsx
+ const location = useLocation()
+ const stateEmail = (location.state as { email?: string } | null)?.email ?? ''
+ const [email, setEmail] = useState(stateEmail)
```

Render the email input only when `!stateEmail`, exactly the way `VerifyPhonePage` already does it —
that pattern is already in the codebase and is the one to copy. Someone arriving at `/reset`
directly (a second device, a reloaded tab) still needs to be able to type it.

---

## 4. Handling a destroyed code — the one genuinely new behaviour

After 5 wrong attempts the code is **deleted server-side**. The correct code stops working too.
Prompting the user to retype is a dead end; they must go get a new code.

`ApiError` already carries the parsed body, so the flag is directly readable — **key off
`codeDestroyed`, not the message string** (the copy may be reworded; the flag will not be):

```ts
import { ApiError } from '@/lib/api'

function isCodeDestroyed(err: unknown): boolean {
  return err instanceof ApiError && (err.body as { codeDestroyed?: boolean })?.codeDestroyed === true
}
```

Both pages currently swallow everything in a bare `catch` with one generic message. Split it:

```diff
- } catch {
-   setError('El código no es válido o expiró. Solicita uno nuevo.')
+ } catch (err) {
+   if (isCodeDestroyed(err)) {
+     setCodeDestroyed(true)   // render the "request a new code" state, hide the code input
+   } else if (err instanceof ApiError && err.status === 429) {
+     setError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
+   } else {
+     setError('El código no es válido o expiró.')
+   }
  }
```

Suggested copy for the destroyed state (both pages):

> **Bloqueamos este código por seguridad.** Hiciste demasiados intentos incorrectos. Solicita un
> código nuevo para continuar.

…with the primary action being **"Reenviar código"** (`VerifyPhonePage`, which already has the
button — just call it from this state) or **"Solicitar código nuevo"** linking to `/recover`
(`ResetPasswordPage`, which already has that link in its footer — promote it to a button).

**429 is a different situation and needs different copy.** It is the per-IP limiter, not the per-code
budget: the code is still alive and waiting is the remedy. `availableAt` is an ISO timestamp you can
count down from if you want to.

> **Expect 429 to be the *common* failure, not the rare one.** The limiter allows 10 failures per
> 15 minutes and its bucket is **shared across `/login`, `/refresh`, `/reset` and `/phone/verify`** —
> while the per-code budget is only 5. So a user who mistypes their password a few times and then
> fumbles a code will hit 429 before they ever reach `codeDestroyed`; measured against a running
> server, that ordering is easy to trigger by hand. Two consequences:
>
> - Treat 429 as a first-class state with its own copy, not an edge case behind a generic error.
> - **Anything sharing a public IP shares the bucket** — an office, a school, mobile carrier NAT. Do
>   not word 429 copy as if the user personally did something wrong ("demasiados intentos" is safer
>   than "hiciste demasiados intentos"), and always offer a retry rather than a dead end.

A resend/`/recover` always mints a fresh code with a **fresh attempt budget**, so recovery from the
destroyed state is a single tap and needs no extra API support. Note that resend is metered by a
*separate*, stricter limiter (5/hour), so a user bouncing between "resend" and "retry" can exhaust
that one too — a 429 from `/phone/resend` means genuinely waiting, not retrying.

---

## 5. `GET /validate/:token` is deleted

The old email-link verification endpoint is **gone** — it now 404s. It resolved a code globally with
no account to scope it to, which bypassed both controls in §1.

There should be nothing to do here: the web client already dropped its on-mount pre-check in
revision 1. Grep for `/validate` to confirm nothing calls it. There is no replacement — verification
is `POST /phone/verify { email, code }` and nothing else.

---

## 5b. TypeScript types

Drop-in replacements for the request types in `src/sections/auth/actions/`. Only the two marked
`CHANGED` differ from what is there now.

```ts
// verifyPhone.ts — CHANGED (gained `email`)
export type VerifyPhoneRequest = {
  email: string
  /** Exactly 6 digits, leading zeros significant. Send as typed — never parse to a number. */
  code: string
}
export type VerifyPhoneResult = { message: string }

// resetPassword.ts — CHANGED (gained `email`)
export type ResetPasswordRequest = {
  email: string
  /** The 6-digit code the user typed. Field is named `token` server-side. */
  token: string
  password: string
}
export type ResetPasswordResult = { message: string }

// resendPhoneCode.ts / requestRecovery.ts — unchanged
export type ResendPhoneCodeRequest = { email: string }
export type RequestRecoveryRequest = { email: string }

// signup.ts — unchanged since revision 1
export type SignupRequest = { email: string; password: string; phone: string }
export type SignupResult = {
  message: string
  user: { email: string; status: string; created: string }
}
```

The error body, for narrowing `ApiError.body` (§0 explains the two envelopes):

```ts
/** Envelope A — controller-rejected. Carries the codeDestroyed flag. */
export type ApiErrorBody = {
  message?: string
  /** Present and true only when the code was destroyed by too many attempts. */
  codeDestroyed?: boolean
  /** Present only on a 429, from the rate limiter. ISO 8601. */
  availableAt?: string
  /** Envelope B — global error handler. */
  error?: { message?: string }
}
```

---

## 6. Update the mocks

`IS_DEV_STAGE` routes both flows to mocks, so the new states are unreachable in dev until these are
updated:

- **`mockVerifyPhone.ts`** — accept `{ email, code }`; keep the `invalid`-prefix rejection, and add a
  `destroyed` trigger so the new UI state is reachable:
  ```ts
  if (data.code.startsWith('destroyed')) {
    return Promise.reject(new ApiError('Too many incorrect attempts. Request a new code.', 400, {
      message: 'Too many incorrect attempts. Request a new code.',
      codeDestroyed: true,
    }))
  }
  ```
  Note the **third argument** — `ApiError`'s `body`. The existing `invalid` mock omits it, which is
  fine for that case but would make a `codeDestroyed` mock silently untestable.
- **`mockResetPassword.ts`** — currently resolves unconditionally and ignores its argument. Give it
  the same `invalid` / `destroyed` triggers so `ResetPasswordPage`'s new branches are reachable.

Existing tests to update: `VerifyPhonePage.test.tsx`, `ResetPasswordPage.test.tsx`,
`RecoverPage.test.tsx`.

---

## 7. Unchanged from revision 1

These are still true and need no work if they already shipped.

**`POST /signup`** requires `phone` — exactly 10 digits, as a string, no country field (the server
always assigns `+52`). 400 `"Phone number must be 10 digits"`, 409 `"Phone number already
registered"`. The phone is never echoed back.

**`POST /phone/resend`** `{ email }` → always `200 { "message": "Verification code sent" }`, including
for an unrecognised email (intentional, non-enumerating). Only a missing/non-string email gets a 400.
Rate limited to 5/hour per IP.

**`POST /recover`** `{ email }` → always 200, non-enumerating. Same 5/hour limit.

**Profile phone fields are gone.** `phoneCountry` / `phoneContact` do not exist on `GET /profile` or
`POST /profile/{profileId}/update`, and there is no replacement read endpoint.

**SMS delivery is now live** — Infobip is wired (this is new since revision 1, but changes nothing
in the client). It is enabled per-environment by the API team; where it is off, the code is written
to the server log instead and the endpoints behave identically. If a code does not arrive in a
deployed environment, that is an API-side configuration question, not a client bug.

---

## 8. Quick reference

| Endpoint | Auth | Body | Schema | Notes |
|---|---|---|---|---|
| `POST /signup` | none | `{ email, password, phone }` | `SignupRequest` | 400 invalid phone, 409 phone taken |
| `POST /phone/verify` | none | **`{ email, code }`** | **`PhoneVerifyRequest`** | 6-digit code; `codeDestroyed` after 5 wrong |
| `POST /phone/resend` | none | `{ email }` | `PhoneResendRequest` | always 200; fresh code + fresh attempt budget |
| `POST /recover` | none | `{ email }` | `RecoverPasswordRequest` | always 200; fresh code + fresh attempt budget |
| `POST /reset` | none | **`{ email, token, password }`** | **`ResetPasswordRequest`** | `token` is the typed 6-digit code; errors are 400s now |
| ~~`GET /validate/:token`~~ | — | — | — | **deleted — 404** |

Live spec: **`/api-docs`**. Bold = changed in this revision.

### Client checklist

- [ ] `verifyPhone.ts` — add `email` to `VerifyPhoneRequest` (§5b)
- [ ] `resetPassword.ts` — add `email` to `ResetPasswordRequest` (§5b)
- [ ] `VerifyPhonePage` — always send `email` (it already holds one); numeric 6-digit input
- [ ] `ResetPasswordPage` — add email field + `useLocation` prefill; numeric 6-digit input
- [ ] `RecoverPage` — pass `state={{ email }}` on the link to `/reset`
- [ ] Both pages — handle `codeDestroyed` and 429 as distinct states
- [ ] Read `codeDestroyed` off `ApiError.body`, not the message string (§0, §4)
- [ ] Mocks + tests for the new states
- [ ] Confirm nothing still calls `GET /validate/:token`

Everything in this document was verified against a running server on 2026-08-29 — request shapes,
every status code, both error envelopes, and the destroyed-code body.
