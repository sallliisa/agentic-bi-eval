---
name: api-conventions
description: Build or review Carta API routes, scopes, entities, permissions, and transactions.
---

# API conventions

Use Sprindle's [reference](../../../packages/sprindle/docs/reference.md) and
[recipes](../../../packages/sprindle/docs/recipes.md) for framework APIs.

| Work | Carta guidance |
|---|---|
| Routes and inherited access | [File routing](references/file-routing.md) |
| Schemas, CRUD, custom persistence, migrations | [Application integration](references/standard-crud.md) |
| Public records, derived fields, files | [Public records](references/public-records.md) |

The root scope resolves identity; `(authenticated)` requires a session. Use
`requirePermission` from `src/identity.ts` where the design requires permission.
Public placement needs an explicit product requirement.

Define codes in `src/authorization/catalog.ts`; keep guards, resource access,
navigation, and seed consistent.

API tests migrate their target. Inspect the target guard and `.env.test.example`
before storage checks. Session helpers live in `src/testing/session.ts`.
