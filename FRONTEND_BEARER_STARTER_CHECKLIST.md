# Frontend Bearer Starter Checklist

Use this when wiring a new frontend app to `auth-engine-x-api`.

The full explanation lives in:

- `CANONICAL_BETTER_AUTH_BEARER_FRONTEND.md`

This file is the short, copy-paste execution checklist.

## Before You Start

- confirm the frontend app has its own domain
- confirm the auth engine domain is reachable
- confirm you want the canonical Better Auth bearer-session flow
- do **not** decide to invent a custom JWT flow unless you have a strong reason

## Required Environment

Frontend:

- `NEXT_PUBLIC_AUTH_URL=https://api.authengine.dev`
- any app-specific API URL vars you need

Backend:

- `BETTER_AUTH_URL=https://api.authengine.dev`
- `BETTER_AUTH_SECRET`
- `ALLOWED_ORIGINS=<frontend-origin>`

## Frontend Checklist

### 1. Create a sign-in proxy route

Create something like:

- `src/app/api/auth/sign-in/route.ts`

It should:

- forward `POST` body to `POST ${NEXT_PUBLIC_AUTH_URL}/api/auth/sign-in/email`
- pass `origin`
- pass `x-forwarded-host`
- pass `x-forwarded-proto`
- read `set-auth-token` from the response header
- set an HttpOnly app-domain cookie such as `pe_session`

Do not:

- read `data.token` from the sign-in response body
- store JWT plugin tokens here

### 2. Create a token readback route

Create:

- `src/app/api/auth/token/route.ts`

It should:

- read the frontend auth cookie
- return whether a token is present

This is for diagnostics and fast proof.

### 3. Create a session-check route

Create:

- `src/app/api/auth/session-check/route.ts`

It should:

- read the frontend auth cookie
- call `GET ${NEXT_PUBLIC_AUTH_URL}/api/auth/token/session`
- send `Authorization: Bearer <cookie>`
- return structured debug output

This route is worth its weight in gold when debugging.

### 4. Update middleware

Middleware should:

- allow public auth routes through
- read the frontend auth cookie
- call `/api/auth/token/session` with bearer auth
- redirect to `/login` on `401`
- clear the auth cookie on invalid session

Do not:

- make middleware invent alternate auth logic
- make middleware silently swallow auth failures

### 5. Add a visible build marker to login during rollout

Temporary but useful:

- put a tiny marker on the login page
- confirm production is actually serving the code you think it is

Remove later if you want, but use it during rollout.

## Backend Checklist

### 1. Enable Better Auth bearer support

In `src/auth.ts`:

- enable `bearer()`

### 2. Use Better Auth session resolution

In `src/index.ts`:

- use `auth.api.getSession({ headers })`
- do not validate the frontend cookie token with `verifyJWT(...)`

### 3. Keep `GET /api/auth/token/session` as a thin adapter

That route should:

- call `getSession(...)`
- return frontend-friendly JSON

It should not:

- become a second auth system

### 4. Keep org-list routes on the same session contract

If a route accepts the frontend bearer cookie token, it should resolve auth the
same way as `/api/auth/token/session`.

## Deployment Checklist

1. build backend locally
2. build frontend locally
3. deploy backend
4. deploy frontend
5. verify backend health endpoint
6. verify frontend login page build marker
7. perform one real sign-in test

## Verification Checklist

After deploy:

1. sign-in response includes `set-auth-token`
2. frontend stores that exact value in its HttpOnly cookie
3. frontend `/api/auth/token` can read it back
4. frontend `/api/auth/session-check` returns success
5. protected route navigation works
6. organization list works
7. invalid token clears cookie and redirects once

## Red Flags

If you see any of these, stop and re-check the contract:

- someone is reading `data.token` from sign-in body
- someone is calling `verifyJWT(...)` on the frontend auth cookie
- someone is using `set-auth-jwt` as the frontend session cookie
- someone is relying on shared browser cookies across domains
- someone says “sign-in is 200 so auth must be fine”

That is how you end up debugging the wrong layer.

## Copy-Paste Rule

For new frontend apps, keep this invariant:

- frontend auth cookie contains the value from `set-auth-token`
- backend validates it with `auth.api.getSession(...)`

Do not drift from that unless you intentionally redesign the auth contract.
