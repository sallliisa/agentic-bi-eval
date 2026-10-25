---
name: verify-carta-module
description: Select and run sufficient proof for Carta application modules; review test value before authoring and delivery.
---

# Module verification

## Select proof

Before implementation, compare approved behavior with the changed owners and
existing coverage. Trust supported, unchanged Sprindle, Loom, and shared app
adapter contracts. Test application decisions and custom wiring.

| Changed behavior | Default proof |
|---|---|
| Standard CRUD, Views, inputs, resource declarations | Required lint and type checks; configuration review |
| Business rules, custom persistence, permissions, side effects | Real route or operation with its database; fixture payloads |
| Application calculation or value conversion | Unit test when it is the cheapest independent proof |
| Endpoint filtering, sorting, pagination | Server test with records that distinguish results |
| Custom browser interaction or client lifecycle | Focused browser proof when lower boundaries cannot establish it |
| External integration | Current provider contract or authorized bounded live check; mocks alone are insufficient |

Use existing proof first. Zero new tests is valid. Each additional layer needs
a distinct uncovered failure. Standard form filling, input validation display,
filter interaction, and framework mechanics do not need module browser tests.
Types establish structural compatibility, not runtime data or authorization.

Keep only uncovered application risks and their selected proof in existing
delivery notes. Reference design requirements; omit field-by-field inventories
and separate justification files. Choose technical checks without new approval.

## Execute

Read [runtime instructions](references/runtime.md) only for live API or browser
proof. Read the [feature index](features/README.md) for mapped behavior; update
the affected recipe when a changed path needs reusable drive instructions.
The map is not a whole-app acceptance checklist for each module.

Read commands from package scripts and scoped instructions. Run required owner
checks; API route changes include normal SDK and web type checks. Inspect
aggregate commands before use. Reuse successful results while their inputs
remain unchanged. Broaden only for changed shared boundaries or observed wider
defects. Optional improvements and unrelated failures do not expand the task.

Use [$test-audit](../test-audit/SKILL.md) before writing or changing tests and
when reviewing their diff. Use [UI review](../web-ui-surfaces/references/verification.md)
for changed web configuration. Fixtures supply starting state and request
values; production actions produce the result. Use existing public form
initialization only when browser proof needs it; keep test-only state setters
and endpoints out of production.

## Evidence and completion

Exercise the real entry point at the selected boundary. Record the action and
observed result; verify persisted effects with a fresh read. Mock only an
external system at an existing production boundary. An API proof establishes
API behavior; it does not establish the page, its entry points, or rendering.

Before completion, review approved requirements against implementation and the
test diff against the authoring gate. Remove or repair unjustified new tests.
Stop when required checks pass and each uncovered application risk has proof.
A missing prerequisite leaves that proof blocked; keep its assertions intact.

Report selected boundaries, commands and actual results, evidence location,
and failed or unverified behavior. Store live proof under
`.local/verification/<run>/`; exclude secrets, cookies, and session tokens.
Cleanup removes owned processes and fixtures, not evidence. For a safe or
dry-run mode, observe the effects it actually skips instead of trusting its name.

To maintain this skill, use `/maintain-verification-skill` when available;
otherwise reconcile affected recipes with current routes and real results.
