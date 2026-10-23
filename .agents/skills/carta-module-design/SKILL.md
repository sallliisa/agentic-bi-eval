---
name: carta-module-design
description: Define Carta module behavior and obtain explicit design approval before delivery.
---

# Carta module design

Settle the business decisions that let the agent deliver the module without
routine human input. This skill produces the design, not application code.

## Understand the change

Read the request, supplied sources, existing decisions, and affected application
code. Use [CONTEXT.md](../../../CONTEXT.md) for Carta terms. Existing code shows
current behavior; the user's requirements define the intended change.

Ask about decisions that change product behavior. For an unfamiliar process,
use a concrete case to learn the actors, normal path, and exceptions. Inspect
repository facts directly and leave routine technical choices to delivery.

## Write the design

Use the [design template](assets/design-template.md) in the existing design
record, or `plans/<feature>/design.md`. Keep its four sections and their order.
List each new or changed field; expand the rules that affect valid behavior.
Describe branches by trigger, result, and next step. Simple CRUD can reference
its functional requirements and standard behavior in the workflow section.

The functional requirements define completion under their applicable data and
workflow rules. Keep each rule in one place. Put useful examples and reasons
beside the rule they explain. Mark unresolved choices beside the affected text.
Update the design directly; Git holds history. Plans, delivery results, annexes,
and addenda do not define or revise requirements.

Check feasibility against current owners and contracts. For web behavior, read
[DESIGN.md](../../../DESIGN.md) and the
[resource architecture](../../../docs/resource_system_overhaul/ARCHITECTURE.md).
Raise known requirements that need additional write authority before handoff.

## Approval and status

Design status is `Draft` or `Approved`. Obtain explicit approval of the current
behavior before delivery. Reuse valid approval on resume. A material behavior
change updates the relevant sections, returns the design to `Draft`, and marks
an existing implementation `Needs update`. Wording corrections preserve status.

Implementation status is `Not started`, `In progress`, `Current`, or `Needs update`.
Delivery sets `Current` after checking all approved functional requirements and
their applicable rules. Status records the result; it does not establish proof.

Design-only work ends at this deliverable. For an authorized build, continue
with [$carta-module-development](../carta-module-development/SKILL.md) after
approval. Routine technical choices need no further approval.
