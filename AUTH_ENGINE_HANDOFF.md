# Auth Engine Handoff: Post-Sign-In Failure

## TL;DR
- Frontend sign-in now succeeds and sets `pe_session` cookie correctly.
- Failure is at session validation step: `GET /api/auth/token/session` returns `401`.
- Upstream error from auth engine: **`"Invalid token payload"`**.
- This strongly indicates a token contract/config issue in `auth-engine-x-api`, not a frontend routing bug.

## What Was Implemented in Frontend

### 1) Origin forwarding in sign-in proxy
- File: `src/app/api/auth/sign-in/route.ts`
- Added forwarding for:
  - `origin`
  - `x-forwarded-host`
  - `x-forwarded-proto`
- Added explicit token extraction + logging before cookie set.

### 2) Cookie persistence verification
- File: `src/app/(auth)/login/page.tsx`
- After successful `/api/auth/sign-in`, frontend now calls `/api/auth/token`.
- Confirms `pe_session` is present before redirect.

### 3) Middleware session validation hardening
- File: `src/middleware.ts`
- Middleware reads `pe_session`, validates against auth engine:
  - `GET ${NEXT_PUBLIC_AUTH_URL}/api/auth/token/session`
  - `Authorization: Bearer <pe_session>`
  - forwards `origin`, `x-forwarded-host`, `x-forwarded-proto`
- Added try/catch + detailed logs.

### 4) Session-check endpoint for browser-visible diagnostics
- File: `src/app/api/auth/session-check/route.ts`
- Added endpoint to replicate middleware validation and return structured diagnostics to browser:
  - `{ ok, step, status, upstream }`

### 5) Additional debug instrumentation
- Files:
  - `src/app/api/auth/token/route.ts`
  - `src/lib/api.ts`
  - `src/lib/auth-fetch.ts`
  - `src/app/(auth)/login/page.tsx`
- Added step logs for token load/use and inline error surfacing.

### 6) Build marker for cache verification
- File: `src/app/(auth)/login/page.tsx`
- Added visible marker: `login-build-d4cdc68` to confirm fresh bundle.

## Observed Runtime Evidence (from browser)

1. `[login] sign-in result: { status: 200, data: { ok: true } }`
2. `[auth-flow][step-2] post-sign-in cookie verification — { status: 200, hasToken: true }`
3. `[auth-flow][step-3] pre-navigation session check — { status: 401, ok: false, data: { ... upstream: { error: "unauthorized", message: "Invalid token payload" } } }`

Interpretation:
- Token issuance endpoint succeeds.
- Cookie write/read succeeds.
- Token/session verification endpoint rejects the token payload.

## Frontend Env State (already confirmed present)
- `NEXT_PUBLIC_AUTH_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Commits Pushed in Frontend During This Debug
- `21f2e77` — fix origin headers in sign-in proxy
- `d1068dd` — instrument/harden post-sign-in flow
- `d4cdc68` — add session-check endpoint + pre-nav validation
- `04d07f5` — add visible login build marker
- `a1293d9` — log raw step-3 payload for exact backend message

## What the Auth-Engine Agent Should Check First

1. **Token type mismatch**
   - Does `/api/auth/sign-in/email` return the same token type expected by `/api/auth/token/session`?
   - Confirm expected claims/payload shape.

2. **Bearer formatting**
   - Ensure sign-in response token is raw token, not prefixed with `Bearer `.
   - If prefixed already, frontend would send `Bearer Bearer ...` and fail parsing.

3. **Signer/verifier config parity**
   - Check all auth-engine runtime instances use identical signing/verification secrets.
   - Verify `BETTER_AUTH_SECRET` (or equivalent) is consistent across issue + validate paths.

4. **Issuer/audience/algorithm consistency**
   - Validate token claims and verification options align:
     - `iss`, `aud`, `sub`, expiry, algorithm, key source.

5. **Endpoint behavior**
   - Reproduce with token returned from sign-in:
     1) call `/api/auth/sign-in/email`
     2) take `token` response
     3) call `/api/auth/token/session` with `Authorization: Bearer <token>`
   - This should succeed in isolation; currently it fails from frontend with `"Invalid token payload"`.

## Not Relevant Noise
- Browser console 404s to `cache.agilebits.com` are from 1Password assets and unrelated.

