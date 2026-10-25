# Sign-in

Users sign in with credentials. Only active accounts may obtain a session.

## Sub-features

- `sign-in-admission`: active credentials create a session; inactive credentials do not.

## How to get to it (user POV)

Open `/auth/login`. The form uses `POST /api/auth/sign-in/email`.
Protected identity is available through `GET /me` after sign-in.

## Driving it with Vitest

Preconditions: `.env.test` passes `pnpm module:preflight -- --needs api,test`.
The spec supplies real credential accounts in active and inactive states.

- Run `pnpm --filter @southneuhof/api test:focused -- src/routes/auth/auth.routes.spec.ts`.
- Require successful active sign-in with one stored session, and inactive
  rejection with no session. The matching active case prevents a broken
  authentication setup from masquerading as correct rejection.

## Gotchas

This spec does not prove logout, login rendering, redirects, or session
revocation. Its fixture rows remain in the disposable test target. Use the
[Users recipe](users.md) for revocation rather than repeating that contract.
