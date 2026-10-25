# Users

Administrators create credential accounts with initial roles, edit users, and
disable them with session invalidation.

## Sub-features

- `users-create`: credentials and exact initial role assignments persist.
- `users-edit`: name changes persist without changing email.
- `users-disable`: disabling an active user ends all of that user's sessions.
- `users-rules`: duplicate email, invalid initial roles, and creation cleanup.

## How to get to it (user POV)

Open Settings → Users (`/settings/users`), then Create, row View, or row Edit.
Direct routes are `/settings/users/create`, `/settings/users/:userId/detail`,
and `/settings/users/:userId/edit`. Role Assignments is a child of detail.
The HTTP equivalents are `POST /users/create`, `GET /users/detail/:id`,
`PATCH /users/update/:id`, and `GET /users/:userId/role-assignments`.

## Driving it with HTTP and Vitest

Preconditions: guarded migrated test database, seeded administrator, and the
owned API instance from [runtime](../references/runtime.md).

- Run `control.mjs users` with the exact invocation in runtime. It signs in,
  creates an account with two fixture roles, and reads the saved account and
  exact assignments independently from PostgreSQL.
- It updates the name through HTTP and reads it back with unchanged email.
- It signs in twice as that account and proves both sessions work, disables
  the account through HTTP, then requires zero stored sessions and two denied
  `/me` requests. The administrator session must still work.
- For changed creation rules, reuse
  `pnpm --filter @southneuhof/api test:focused -- 'src/routes/(authenticated)/users/users.routes.spec.ts' 'src/routes/(authenticated)/users/users.compensation.spec.ts'`
  from the repository root. Read each case's scope; the existing revocation
  case has one session, not proof of the all-sessions contract.

## Gotchas

The HTTP helper proves no UI entry point. Standard create/edit bags need
configuration review and type checks. The edit page's custom confirmation
needs browser proof if changed: Cancel preserves state; Confirm performs the
write. Do not fill the whole form to check that branch. Existing route specs
may retain fixture rows; use only the disposable target. Do not duplicate
their rules in new unit, component, or browser suites.
Better Auth account creation can leave an initial session. The helper counts
it before two sign-ins and requires every stored session to be removed.
