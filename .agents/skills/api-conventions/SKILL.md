---
name: api-conventions
description: Build or review Carta backend file routes, inherited scopes, entities, permissions, and transactions.
---

# API conventions

Use the current Sprindle [reference](../../../packages/sprindle/docs/reference.md)
and [recipes](../../../packages/sprindle/docs/recipes.md) for framework APIs.
Use the approved design for business rules and selected operations.

| Work | Carta guidance |
|---|---|
| Routes and inherited access | [File routing](references/file-routing.md) |
| Schemas, CRUD, custom persistence, migrations | [Application integration](references/standard-crud.md) |
| Public records, derived fields, stored files | [Public records](references/public-records.md) |

The root scope resolves identity; `(authenticated)` requires a session. Use
`requirePermission` from `src/identity.ts` when the approved operation needs a
permission. Public placement needs an explicit product requirement.

Define permission codes in `src/authorization/catalog.ts`. Keep API guards,
resource access, navigation, and required seed consistent. Authentication alone
does not establish record-level authorization.

API tests migrate their target. Inspect the target guard and `.env.test.example`
before running storage checks. Reuse `src/testing/session.ts` for session helpers.
Verification scope belongs to module delivery.
