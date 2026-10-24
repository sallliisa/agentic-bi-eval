# Application integration

## Schemas

Keep tables, schemas, and entities in their module folder. Import foreign-key
tables from their owners. `+scope.ts` registers the entity; `src/domains.ts`
registers domain parts.

The [users schema](../../../../apps/api/src/routes/%28authenticated%29/users/schema.ts)
and [entity](../../../../apps/api/src/routes/%28authenticated%29/users/users.entity.ts)
show table-derived and operation schemas. `userCreateSchema` accepts table inserts;
`createUserSchema` accepts custom user-create input. Web imports follow the
[API schema boundary](../../../../docs/architecture/web-application-architecture.md#api-schema-boundary).

Reuse `optionalText` for nullable text. Preserve each table's audit nullability
and foreign keys when adapting examples.

## Operations

Use [Sprindle operations](../../../../packages/sprindle/docs/reference.md#file-routes)
for parsing, status, and responses. Keep single-owner operations in their route;
extract shared code for real consumers.

Custom `run` owns persistence: apply `state.where` to reads and writes,
`state.values` after client values, and return required relations. An access
read does not authorize an unscoped write.

`create-app.ts` installs `dataWrite: auditStamp()` for canonical create/update.
Other writes supply audit values. A `defineRoute` handler must parse input and
convert public output; OpenAPI metadata does not parse requests.

## Migrations

Review SQL against the data change and existing rows. Check the target before
writes. Preserve applied migrations; stop affected writes on schema/history
mismatch. Seed with stable keys and preserve unrelated records on repeat runs.

`softDeleteRoute` has no scope option; scoped soft-delete needs an equivalent
atomic predicate in application code.
