---
name: migrate-web-resource
description: Retired. The old operations-file to field-catalog resource migration no longer matches Carta's current resource contract.
---

# Retired migration guide

Do not use this skill to edit a web resource. Its target API has been removed.

For new module work, use [`carta-module-development`](../carta-module-development/SKILL.md)
and the current [resource architecture](../../../docs/resource_system_overhaul/ARCHITECTURE.md).

The current contract uses raw operation schemas, independent
`defineForm`/`defineTable`/`defineDetail` maps, and one-object
`defineResource`. List and create bags are static. Detail and update bind an
identity. Keep route files, route names, and permission ownership in the app.
