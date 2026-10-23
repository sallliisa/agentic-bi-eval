---
name: carta-module-development
description: Build or resume a Carta module after design approval, or plan or review a module when requested.
---

# Carta module delivery

Design approval is the human handoff. After approval, own planning, setup,
implementation, checks, review, and repair through completion.

## Start from the design

Read the request, current design, relevant diff, and saved work. The design is
the source of requirements. Use [$carta-module-design](../carta-module-design/SKILL.md)
when explicit approval is missing or behavior needs to change. Reuse valid
approval and completed work on resume.

A plan-only request ends with the plan. A review-only request inspects the named
result and reports findings without changing application code or delivery status.

## Plan and implement

Choose work order and technical details within the approved behavior. Use an
optional `plan.md` beside the design when dependencies or unfinished work need
persistent notes. Follow the [plan format](references/planning.md). Small changes
can proceed directly. A plan organizes execution and does not define requirements.

Read guidance at the changed boundary:

| Change | Guidance |
|---|---|
| API, data, permissions, transactions | [$api-conventions](../api-conventions/SKILL.md) |
| Web pages, resources, routes, navigation | [$web-ui-surfaces](../web-ui-surfaces/SKILL.md) |
| Forms and user input | [$build-resource-form](../build-resource-form/SKILL.md) |

Set implementation status to `In progress`. Complete connected behavior and
required development setup within existing write authority, including migrations,
system seed, access, navigation, and preview. Use current framework contracts and
compiled examples. Keep unsupported requirements local within scope.

Resolve technical failures and repair in-scope defects without routine approval.
If a business decision or write authority blocks part of delivery, continue
independent work and report the dependency. Business changes update the design
and need approval of the changed scope.

## Verify and finish

Use [verification](references/verification.md). Account for every approved
functional requirement under its applicable rules. Finishing a plan alone does
not establish module completion. Update task state and delivery notes from actual
results; keep them outside the design's requirements.

Set implementation status to `Current` only when required behavior, development
setup, and checks are complete. Keep incomplete work visible and make the final
response agree with the recorded result. Report the result, preview and setup
status, checks, and gaps. Browser verification remains excluded.
