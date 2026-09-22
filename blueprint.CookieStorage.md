# Blueprint — Cookie storage for auth tokens

Plan for `feature.CookieStorage.md`: move the access and refresh JWTs out of
`localStorage` and into cookies, without changing how authentication works.

---

## 0. Where we actually are

Token storage is already a single module. `src/lib/auth.ts` is 35 lines and owns
the two keys (`alk.token`, `alk.refreshToken`); everything else in the app reads
tokens through its four exported functions:

| Caller | Uses |
|---|---|
| `src/lib/api.ts` | `getToken`, `getRefreshToken`, `setTokens`, `clearTokens`, `getTokenExpiryMs` |
| `src/sections/auth/AuthContext.tsx` | `getToken`, `setTokens`, `clearTokens`, **`TOKEN_KEY`** |
| `src/sections/notifications/liveSocket.ts` | `getToken` |

So the storage swap itself is one file. The interesting work is entirely in the
things that were true *because* it was `localStorage` and stop being true:

1. **`TOKEN_KEY` is exported for a `storage` listener.** `AuthContext.tsx:63-73`
   watches for another tab clearing the token and, when it sees one, ends this
   tab's session, clears the query cache and drops the persisted blob. That
   listener is R2/D8 of `blueprint.CachePersistence.md` and it is directly tested
   (`queryPersist.test.tsx:322`). **Cookies fire no event.** Writing
   `document.cookie` in one tab is invisible to every other one. This is the only
   real hole the change opens, and it must be closed in the same PR.

2. **Seven test files seed a session with `localStorage.setItem('alk.token', …)`**
   and tear down with `localStorage.clear()`. Both halves stop working.

3. **`localStorage` is unbounded and silent on failure; cookies are neither.**
   ~4 KB per cookie, and an oversized write is a *no-op with no error* — the
   failure mode is "login appears to succeed, then the user is logged out".

Note what is *not* affected: the persisted query cache (`alkachof.query`) stays
in `localStorage`. This feature is about JWTs, and the cache blob is megabytes
at the wrong end of a 4 KB limit. The two are unrelated and should stay so.

---

## 1. What this buys, stated honestly

It should be written down before anyone builds it, because the obvious reading
is wrong.

**This is not an XSS mitigation.** The API authenticates with an `Authorization:
Bearer` header and the feature requires that not to change ("fundamentals of
procedures to authenticate an user should not change"). A header the client
builds is a token JavaScript can read, so the cookie cannot be `HttpOnly`. An
attacker with script execution reads `document.cookie` exactly as easily as
`localStorage.getItem`. The real hardening — `HttpOnly; Secure; SameSite`
cookies set by the API on `/login` and `/refresh`, with `credentials: 'include'`
and no header at all — is a *backend* change and is explicitly out of scope here.

What it does buy:

- **One storage mechanism with an expiry the browser enforces.** `localStorage`
  never expires; a device that stops being used keeps a valid refresh token
  forever. `Max-Age` ends it without anyone having to log out.
- **It works where `localStorage` throws.** Safari private mode throws on
  `localStorage` access; cookies are available there.
- **It is the shape the backend change will need.** If the API later moves to
  server-set cookies, the client is already cookie-based and `auth.ts` is the
  only file that changes again.

If the ask behind the feature was "make tokens safer from XSS", this does not
deliver it and the backend ticket should be raised instead. If it was "stop
using `localStorage` for credentials", this delivers exactly that.

---

## 2. Decisions

### D1 — Two cookies, same names as the keys they replace

`alk.token` and `alk.refreshToken`. Keeping the names makes the diff readable
and the migration (D6) trivial. One JSON cookie holding both would halve the
attribute boilerplate and double the odds of hitting the size cap; two is
cheaper.

### D2 — Attributes

```
path=/; SameSite=Strict[; Secure]
```

- **`path=/`** — the SPA reads tokens from every route.
- **`SameSite=Strict`** — the cookie is never *sent* anywhere that matters (the
  API is a different origin; auth rides the header), so `Strict` costs nothing
  and `Lax` buys nothing. Pick the tighter one.
- **`Secure` only when `location.protocol === 'https:'`.** This is conditional
  and must stay conditional: a `Secure` cookie set over `http://localhost:5173`
  is silently discarded, and `npm run dev` would not be able to log in.
- **No `Domain`.** Host-only. `app.alkachof.mx` must not hand its tokens to a
  sibling subdomain.

### D3 — One `Max-Age` for both cookies: the refresh token's lifetime

The tempting version — access cookie expiring at the JWT's `exp`, refresh cookie
long-lived — breaks the boot path. `AuthContext.tsx:34` seeds `hasSession` from
`Boolean(getToken())`. If the access cookie has evaporated while a valid refresh
token remains, the app boots as logged out, and nothing ever calls `/refresh`
because nothing thinks there is a session to refresh.

So both cookies carry the same `Max-Age`. The access token's real expiry is the
`exp` claim, enforced by the API and read locally by `getTokenExpiryMs` for the
proactive refresh in `api.ts:112-118` — that machinery is untouched and is what
actually governs access-token lifetime. The cookie's `Max-Age` governs only *how
long a session survives on this device*, which is the refresh token's job.

The value equals the API's refresh-token TTL: **7 days**, measured from a real
`/login` response (`exp - iat === 604800` on the refresh token; the access token
is 3600). It lives in one named constant, `SESSION_MAX_AGE_SECONDS`. `/refresh`
rotates the refresh token and `api.ts` writes the pair back through `setTokens`,
so an active session re-arms the window on every refresh.

### D4 — Cross-tab logout moves to a non-secret marker in `localStorage`

The listener from `blueprint.CachePersistence.md` R2 has to keep working. Three
ways to do it:

| | |
|---|---|
| **Poll `document.cookie`** | Rejected. A timer on every tab to notice something that happens twice a day. |
| **`BroadcastChannel`** | The natural fit — but **jsdom 29 does not implement it** (verified: `typeof window.BroadcastChannel === 'undefined'`). It would need a polyfill in `src/test/setup.ts`, and the thing under test would then be the polyfill. |
| **A marker key in `localStorage`** | **Chosen.** |

`alk.session` holds a random id written on login and removed on logout. It is
**not a credential** — it is a value with no meaning to the API, and the feature
bars JWTs from `localStorage`, not the existence of the key. The existing
listener keeps its shape; `TOKEN_KEY` is replaced by `SESSION_MARKER_KEY` in its
import, and `if (getToken()) return` still guards against a stale event.

A random id rather than `'1'` so that "another tab logged in as someone else"
is distinguishable later if it ever needs to be. Today only its removal is read.

### D5 — Values are percent-encoded

A JWT is base64url and dots — all legal in a cookie value — so this is belt and
braces, not a fix. It costs two function calls and means `auth.ts` cannot be the
thing that breaks if a token format ever changes.

### D6 — One-shot migration, deleted after one release

On module load, if `localStorage` holds `alk.token`, move both tokens into
cookies and remove the `localStorage` keys. Six lines, and it is the difference
between "nobody notices" and "every logged-in seller is logged out by a deploy".
Leave a dated comment saying when it can go (one release after ship).

Alternative considered: ship without it and accept the forced re-login. Cheaper
to write, and defensible pre-v1 — but sellers are already on the app and a
mystery logout is a support message. Not worth saving six lines.

### D7 — A failed cookie write is a thrown error, not a silent no-op

`setTokens` reads back what it wrote and throws if the cookie did not stick. See
R1 — without this, the size cap surfaces as an unexplainable logout loop.

---

## 3. Risks, worst first

### R1 — The 4 KB cap, hit silently · *high severity, low likelihood*

Browsers cap a single cookie at ~4096 bytes (name + value + attributes) and the
per-origin total at ~4 KB–10 KB depending on the browser. Assigning an oversized
`document.cookie` **does nothing and reports nothing**.

The failure is nasty precisely because it is delayed: login succeeds, `setTokens`
appears to work, the navigation happens, and the first `api()` call goes out
unauthenticated.

**Measured: 209 bytes each** — plain HS256 JWTs carrying `{ email, userId, iat,
exp }`, about 5% of the cap. So this is a tripwire rather than a constraint, and
D1 stands. Both guards ship anyway: `cookies.ts` refuses a cookie string over
4096 bytes before writing, **D7's read-back check** catches everything else a
browser may silently refuse, and a unit test writes a 5 KB token and asserts the
throw.

### R2 — Safari's cap on script-written cookies · *refuted*

ITP 2.1 capped the lifetime of any cookie set via `document.cookie` at 7 days
regardless of `Max-Age`, which would have logged out every iPhone seller weekly.
**That cap was removed in a 2022 WebKit release** — client-set cookies keep their
requested `Max-Age`.

What remains is the general purge of *all* script-writable storage after 7 days
of browser use without interaction with the site. That applied equally to what
this replaces, so there is no iOS regression here. (A site classified as a
tracker, reached via a link carrying decoration parameters, still sees a 1-day
cap; Alkachof is neither.)

Moot in any case: the API's refresh TTL is the same 7 days, so no storage
mechanism keeps a session alive longer.

Sources: [WebKit ITP 2.1](https://webkit.org/blog/8613/intelligent-tracking-prevention-2-1/),
[Expiration cap removed from JavaScript cookies in WebKit browsers](https://www.simoahava.com/privacy/first-party-cookies-webkit-revisited/).

### R3 — Tests leak sessions between cases · *medium severity, certain*

jsdom keeps one cookie jar per test **file**. Every existing `afterEach` calls
`localStorage.clear()`, which no longer clears anything auth-related, so a test
that logs in leaves the next test in the file authenticated. Silent, and it
makes tests pass for the wrong reason.

Mitigation: a global `afterEach(clearTokens)` in `src/test/setup.ts` — one place,
applies to every file, cannot be forgotten by the author of the next test.

### R4 — Cookies ride every request to the app's own origin · *low severity, certain*

Cookies are attached to same-origin requests. The API is a *different* origin
(`api.alkachof.mx`), so API calls are unaffected — but every request to
`app.alkachof.mx` (`index.html`, each hashed asset, `/version.json`) now carries
~1–2 KB it did not before. On mobile data, on the cold-start path, against an app
whose whole caching design is about not spending bytes.

Accepted. The hashed assets under `/assets/` are `immutable` and mostly served
from cache, so the real cost is a handful of requests per cold start. The fix if
it ever matters — assets on a cookieless subdomain — is a deploy concern and out
of scope.

### R5 — The cross-tab marker drifts out of sync with the cookies · *medium severity, low likelihood*

`alk.session` is now a second thing to keep in step. If a path clears the cookies
without clearing the marker, other tabs never learn the session ended.

Mitigation: the marker is written and removed **only** inside `setTokens` and
`clearTokens`. No caller touches it, it is not exported for writing, and every
existing session-end path already funnels through `clearTokens` (`logout`, the
401 give-up in `api.ts:126`, the failed-profile effect in `AuthContext.tsx:46`).

### R6 — `Secure` shipped unconditionally · *high severity if it happens, low likelihood*

Hardcoding `Secure` passes every test (jsdom runs on `http://localhost` and
jsdom's cookie jar is lenient) and breaks `npm run dev` for everyone. Guard it on
`location.protocol` and give it its own test.

---

## 4. Implementation

### Step 1 — `src/lib/cookies.ts` (new)

A leaf module with no app knowledge: `readCookie(name)`, `writeCookie(name,
value, maxAgeSeconds)`, `deleteCookie(name)`. Owns the attribute string, the
percent-encoding (D5) and the `Secure` guard (D6). Deletion is a write with
`Max-Age=0` **and the identical `path`/`SameSite`** — a mismatched path deletes
nothing and leaves the user logged in.

Guard `typeof document === 'undefined'` on read, matching `queryPersist.tsx:112`.

### Step 2 — `src/lib/auth.ts`

Same four exports, same signatures. Internals swap to `cookies.ts`.

- `TOKEN_KEY` export is **removed**; `SESSION_MARKER_KEY = 'alk.session'` takes
  its place (D4).
- `setTokens` writes both cookies, writes the marker, then reads back and throws
  if either cookie is missing (D7).
- `clearTokens` deletes both cookies and removes the marker.
- `getTokenExpiryMs` is untouched — it parses a JWT and never knew where it came
  from.
- The D6 migration runs at module scope, with its removal date in the comment.
- One `SESSION_MAX_AGE_SECONDS` constant (D3), commented with where the 7 days
  comes from.

### Step 3 — `src/sections/auth/AuthContext.tsx`

Two lines and a comment. The import swaps `TOKEN_KEY` → `SESSION_MARKER_KEY`;
`event.key === SESSION_MARKER_KEY && event.newValue === null` is the new
condition. **The comment above it must be rewritten** — it currently says
"Tokens live in shared `localStorage`", which becomes false and is the sentence
the next reader will trust.

`api.ts` and `liveSocket.ts` need **no changes**.

### Step 4 — `src/test/setup.ts`

`afterEach(() => clearTokens())` (R3). Import from `@/lib/auth` so the cleanup
follows the implementation if storage ever moves again.

### Step 5 — The seven test files

Replace `localStorage.setItem('alk.token', 'test-token')` with
`setTokens('test-token', 'test-refresh')` from `@/lib/auth`. Using the real
function, not a hand-written cookie, is the point: a test that hand-rolls the
storage format tests the format rather than the app.

`queryPersist.test.tsx:322-333` is the one with actual content — its
`StorageEvent` must be re-keyed to `alk.session`, and the `localStorage.removeItem`
before it becomes `clearTokens()`. Its name ("ends the session when another tab
clears the token") stays accurate.

### Step 6 — Documentation

- **`CLAUDE.md`** — the Caching section says logout clears the cache "because the
  client is module-scope"; that stays true. Add a short note under it that tokens
  live in cookies, that the cookie is **not** `HttpOnly` and why, and that
  `alk.session` exists solely as the cross-tab signal. Someone will otherwise
  delete that key as dead weight.
- **`blueprint.CachePersistence.md`** — R2/D8 describe the hole in terms of
  `localStorage` tokens. Append rather than rewrite: the hole is unchanged, the
  signal moved.
- **`feature.CookieStorage.md`** — leave as written.

---

## 5. Testing

New `src/lib/__tests__/auth.test.ts`:

- round-trip: `setTokens` → `getToken` / `getRefreshToken`
- `clearTokens` removes both **and** the marker
- oversized token throws (R1)
- `Secure` absent on `http:`, present on `https:` (R6)
- the D6 migration moves `localStorage` tokens and empties the old keys
- a value needing encoding survives the round trip (D5)

Existing suites carry the rest: `AuthCache.test.tsx` covers login/logout through
the provider, and `queryPersist.test.tsx` covers the cross-tab path. If those
two pass unchanged except for their seeding, the swap is transparent — which is
what the feature asks for.

**Manual, because no test can cover it:** log in on the real dev server, reload
(session survives), let the access token expire and confirm the proactive
refresh still fires, log out in one tab and confirm a second tab follows, and
run the whole thing once in Safari for R2.

---

## 6. Definition of done

- No JWT is written to `localStorage` by any code path.
- `getToken` / `getRefreshToken` / `setTokens` / `clearTokens` keep their
  signatures; `api.ts` and `liveSocket.ts` are untouched.
- Cross-tab logout still ends the session, still clears the cache, still drops
  the persisted blob — same test, re-keyed.
- An existing logged-in user is still logged in after the deploy (D6).
- `npm run build`, `npm run lint`, `npm test` clean.
- Token sizes and the Safari finding are in the PR description (both in §8).

---

## 7. Open questions

**Q2 — Is the API planning `HttpOnly` cookies?** If server-set auth cookies are
on the roadmap, this client-side version is a stepping stone at best and wasted
work at worst, and R2 makes it actively worse than what we have on iOS. Worth
five minutes with whoever owns `alkachof-api` before starting.

**Q3 — Does `feature.CookieStorage.md` want the security property or the
mechanism?** §1 argues these are different asks and only one of them is in
scope here.

---

## 8. For the PR description

- **Token sizes:** access 209 bytes, refresh 209 bytes, against a ~4096-byte cap
  (R1).
- **Session lifetime:** 7 days, equal to the API's refresh-token TTL, measured
  rather than assumed (D3).
- **Safari:** the 7-day cap on script-written cookies no longer exists; the
  storage change is not an iOS regression (R2).
- **Q2 and Q3 stay open.** §1 still holds: this delivers "stop using
  `localStorage` for credentials", not an XSS mitigation. If the API takes up
  `HttpOnly` cookies later, `auth.ts` and `cookies.ts` are the only files that
  change again.
- **Unrelated fix carried in this branch:** Node 26 defines its own experimental
  `localStorage` global, so vitest's jsdom environment skipped installing jsdom's
  and **141 tests failed on a clean tree** before this work started — every one on
  a bare `localStorage` call. `src/test/setup.ts` now backs the name with jsdom's
  `sessionStorage` instance. It had to be fixed to verify anything here.
