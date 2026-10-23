# Application integration

## Schema owners

Keep the table, schema, and entity in their module folder. Tables import other
table owners for foreign keys. `+scope.ts` registers the entity for its subtree.
`apps/api/src/domains.ts` registers domain parts.

The [users schema](../../../../apps/api/src/routes/%28authenticated%29/users/schema.ts)
and [entity](../../../../apps/api/src/routes/%28authenticated%29/users/users.entity.ts)
show table-derived schemas and distinct operation input. `userCreateSchema`
describes a table insert; `createUserSchema` accepts the custom user-create input.
Web consumers import these through physical API package exports under the
[API schema boundary](../../../../docs/architecture/web-application-architecture.md#api-schema-boundary).

Reuse `optionalText` from the app schema for nullable text. Keep each table's
actual audit nullability and foreign keys when adapting an example.

## Operations

Use [Sprindle operations](../../../../packages/sprindle/docs/reference.md#file-routes)
for their parsing, status, and response contracts. Keep a custom operation with
its route while one route owns it. Extract shared business code for real consumers.

A custom `run` owns its persistence: apply `state.where` to scoped reads and
writes, apply `state.values` after client values, and return required relations.
An access read followed by an unscoped write does not preserve the access boundary.

`create-app.ts` installs `dataWrite: auditStamp()`. Canonical create/update use
it; custom operation writes must supply the required audit values themselves.
`defineRoute` also owns runtime input parsing and public output conversion;
OpenAPI request-body metadata does not parse a request.

## Migrations

Review generated SQL against the approved data change and existing rows. Inspect
the selected target before writes. Preserve applied migrations; stop affected
writes if schema and migration history disagree. Required seed uses stable keys
and preserves unrelated records on repeated runs.

The current `softDeleteRoute` has no scope option. A scoped soft-delete needs
an equivalent atomic predicate in application code.
