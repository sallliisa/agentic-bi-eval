---
name: carta-module-development
description: Deliver approved Carta modules, or produce requested implementation plans or reviews.
---

# Carta module delivery

## Start

Read the current design, diff, and saved work. Preserve valid approval and
completed work. Use [$carta-module-design](../carta-module-design/SKILL.md) for
missing approval or changed behavior. After approval, own delivery without
routine human input.

Plan-only requests end at the plan. Review-only requests return findings
without changing application code or delivery status.

## Implement

Use [$verify-carta-module](../verify-carta-module/SKILL.md) to select proof
before implementation.

Use the optional [plan format](references/planning.md) when execution or resume
needs a file. Choose technical details within approved behavior.

| Change | Guidance |
|---|---|
| API, data, permissions, transactions | [$api-conventions](../api-conventions/SKILL.md) |
| Pages, resources, routes, navigation | [$web-ui-surfaces](../web-ui-surfaces/SKILL.md) |
| Forms and inputs | [$build-resource-form](../build-resource-form/SKILL.md) |

Set implementation status to `In progress`. Complete connected behavior and
required development setup: migrations, system seed, access, navigation, and
preview. Use current compiled examples for unfamiliar APIs.

Apply new migrations to the app's configured development database before
completion. Migrating only the test database does not count; failures leave
delivery incomplete.

Repair in-scope defects. Report blocked decisions or write authority and continue
independent work. Business changes require design updates and approval.

## Finish

Complete [$verify-carta-module](../verify-carta-module/SKILL.md). Set
implementation status to `Current` only after approved requirements,
development setup, and required checks are complete. Update task status from
actual results; the final report must agree. Report the result, preview/setup
status, checks, and remaining gaps.
