# Role permissions

Administrators inspect active permissions and assign or remove them from a role.

## Sub-features

- `role-permissions-query`: active-only results, paging, search, and ordering.
- `role-permissions-write`: grant and revoke persist; readers cannot mutate.

## How to get to it (user POV)

Open Settings → Roles (`/settings/roles`), open a role, then Permissions
(`/settings/roles/:roleId/detail/permissions`). The HTTP collection is
`GET /roles/:roleId/permissions`; PUT and DELETE use
`/roles/:roleId/permissions/:permissionId`.

## Driving it with Vitest

Preconditions: `.env.test` passes `pnpm module:preflight -- --needs api,test`.
The existing spec creates its own users, role, and distinguishable permissions.

- Run `pnpm --filter @southneuhof/api test:focused -- 'src/routes/(authenticated)/roles/role-mapping.routes.spec.ts'`.
- The route test checks exact pages and totals, excludes the inactive fixture,
  checks sort order, and reads stored grant/revoke state. Reader denials must
  leave that state unchanged. Its `finally` removes owned fixtures.

## Gotchas

This establishes server behavior only. Standard filter controls use shared
coverage. A changed custom switch needs a focused browser check for pending
state and failure feedback; mocked network responses establish client feedback
only. The route test does not establish the user's role-assignment controls.
