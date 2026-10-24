---
name: carta-module-design
description: Define Carta module behavior for explicit user approval.
---

# Carta module design

## Discover

Inspect affected code and supplied sources before asking business questions.
Code establishes current behavior, not intended policy. Use [CONTEXT.md](../../../CONTEXT.md)
for terms. Learn unfamiliar workflows through concrete cases; leave routine
technical choices to delivery.

## Write

Use the [template](assets/design-template.md) in the existing design record or
`plans/<feature>/design.md`. Keep its four sections and order. List every new
or changed field. Describe branches by trigger, result, and next step; ordinary
CRUD can reference standard behavior.

Functional requirements and their data and workflow rules define completion.
Define each rule once; place reasons, examples, and unresolved choices beside
it. Update this document directly. Keep plans and delivery notes outside it;
use Git for history, not annexes or addenda.

Check feasibility against current contracts. For web work, read
[DESIGN.md](../../../DESIGN.md) and the
[resource architecture](../../../docs/resource_system_overhaul/ARCHITECTURE.md).
Resolve business questions; raise known write-authority needs before approval.

## Approve

- Design: `Draft` or `Approved`. Set `Approved` only after explicit user approval
  of the current scope. Preserve approval for unchanged behavior.
- Implementation: `Not started`, `In progress`, `Current`, or `Needs update`;
  delivery maintains this status.

Material behavior changes return the design to `Draft` and an existing implementation
to `Needs update`. Wording corrections preserve status.

End design-only requests here. Continue authorized builds with
[$carta-module-development](../carta-module-development/SKILL.md) after approval.
