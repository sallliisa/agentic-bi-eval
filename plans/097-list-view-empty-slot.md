# Plan 097: Declare the existing empty slot contract

## Status

- Priority: P2
- Effort: S
- Risk: LOW
- Depends on: Plan 092 (DONE); no dependency on other plans in this batch
- Category: migration / correctness
- Planned at: commit `16e7b08`, 2026-10-12
- Status: DONE — parent APPROVE

## Intent and current state

ListView forwards empty at runtime but omits it from typed slots. Vue applications must be able to author the supported empty slot without type errors.

ListView.vue:47–65 defines typed slots without empty; :217–234 filters passthroughSlots without excluding empty; :674–680 forwards those slots to Table. Table forwards non-collection slots to TableContent.

## Conventions and verification

Use pnpm, Vue script setup, and the existing component style. Write no code comments. Match `BaseInput.vue` scoped controlBindings and explicit validation event ownership. Tests must use real rendered behavior; read `.agents/skills/test-audit/SKILL.md`. Every new regression needs an observed baseline failure and a post-fix pass. Do not add a production seam for tests. Dependencies are already installed; do not install or upgrade them.

For browser setup, match `src/components/inputs/__tests__/DateInput.browser.spec.ts`: createApp, FrameworkPlugin, real components, cleanup afterEach. For DOM unit setup, use `src/components/core/__tests__/harness.ts`. Tests run from the package using the root pnpm filter below. No edits while Vitest is running.

## Scope

- `packages/loom/src/components/views/ListView.vue`
- `packages/loom/src/components/views/__type-tests__/list-view-collection.type-test.vue`
- `packages/loom/src/components/views/__tests__/ListView.browser.spec.ts`
- This plan file and its status in `plans/README.md`

Out of scope: apps, API, Sprindle, dependency manifests, image ratio warnings, and unrelated framework changes. Do not redesign Collection, Table, or slot naming. Stop if empty is not a runtime passthrough slot or its props require another public contract change.

## Drift check and git workflow

Run `git diff --stat 16e7b08..HEAD -- packages/loom/src/components/views/ListView.vue packages/loom/src/components/views/__type-tests__/list-view-collection.type-test.vue packages/loom/src/components/views/__tests__/ListView.browser.spec.ts` first; expect no source drift. Compare current-state excerpts if it reports changes; stop on unexplained mismatch. Work on the current main checkout. The parent owns commit and push after review. Do not commit, push, merge, or write to external systems from the implementation agent.

## Steps and per-step gates

1. Read TableContent empty-slot invocation to establish exact slot props. Extend list-view-collection.type-test.vue with a valid empty slot matching the real contract; do not invent slot props. Verify `pnpm --filter @southneuhof/loom type-check` rejects it on baseline for the intended missing slot, or use the existing diagnostics runner if normal typecheck does not check slot names and document why.
2. Add only the missing optional empty slot declaration to ListView defineSlots. Extend the existing real ListView browser suite with custom empty text after load returns no records, if that contract is not already covered. Do not change forwarding or empty-state layout. Verify `pnpm --filter @southneuhof/loom type-check` and `pnpm --filter @southneuhof/loom test:browser -- src/components/views/__tests__/ListView.browser.spec.ts` pass.

## Test plan and done criteria

The steps specify primary test ownership and baseline failures. Explain the protected behavior, credible regression, and why existing tests do not catch it before adding tests. Keep shared mocked tests only for distinct popup integration contracts; do not use them to claim real picker or animation proof.

After all plans in this batch, run these gates sequentially where files overlap; all must exit 0:

| Purpose | Command | Expected |
|---|---|---|
| Unit tests | `pnpm --filter @southneuhof/loom test` | All pass |
| Browser tests | `pnpm --filter @southneuhof/loom test:browser` | All pass |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | No errors |
| Consumer types | `pnpm --filter @southneuhof/framework-web type-check` | No errors |
| Contract diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | All pass |
| Architecture | `pnpm test:surface-architecture` | All pass |
| Diff hygiene | `git diff --check` | No errors |

Read the complete diff. Check no added code comments and no changes outside this batch's declared scope. Restore any tracked browser attachments changed by failed-test cleanup only if the baseline proves they belong to the previous commit. Update this plan and the index with commands, results, baseline failure evidence, and deviations. Parent approval is required before DONE.

## Implementation evidence (parent APPROVE)

- Baseline type regression: `pnpm --filter @southneuhof/loom type-check` reported `Property 'empty' does not exist on type '__VLS_Slots'` for the added valid `#empty` slot in this type fixture. That baseline run also caught temporary in-progress attribute binding errors from Plans 095 and 096; those were corrected before the final type gate.
- Post-fix `pnpm --filter @southneuhof/loom type-check` passed. `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/views/__tests__/ListView.browser.spec.ts` passed 1 file and 3 tests, including the custom empty text after an empty load.
- TableContent invokes `empty` with no props, so ListView declares only the optional zero-argument slot and leaves runtime forwarding unchanged.
- Final batch gates and warnings are in `plans/README.md`.

## STOP conditions

Stop and report if source assumptions drift, a verification gate fails twice after a reasonable repair, an out-of-scope edit is required, or a test cannot establish its stated contract. For a baseline that passes, report what it proves and revise the regression; do not fabricate a red result. Unavailable skills or repo-specific scripts referenced by test-audit must be reported; use this repository's actual commands and direct parent review, not unrelated tooling.

## Maintenance notes

Future updates to Vue fallthrough, Reka presence, VueDatePicker events, or BaseInput controlBindings must preserve the behavior established here. Avoid compatibility props and duplicate state. Record exact verification warnings and unverified cases in the completion report.

## Parent acceptance — 2026-10-12

Parent read the complete source and test diff and reran 502 unit tests, 79 browser tests, Loom types, contract diagnostics, and 34 architecture tests. All passed. Consumer type checking reproduces 10 diagnostics also observed with all six modified component sources restored to commit 16e7b08. This existing failure is an accepted verification deviation, not a passing consumer gate. Scope is clean; no added code comments. Direct review replaces unavailable autoreview. User authorized commit and push to origin/main.
