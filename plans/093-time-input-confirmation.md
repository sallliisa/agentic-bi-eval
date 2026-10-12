# Plan 093: Confirm time values before validation

## Status

- Priority: P1
- Effort: M
- Risk: MED
- Depends on: Plan 092 (DONE); no dependency on other plans in this batch
- Category: migration / correctness
- Planned at: commit `16e7b08`, 2026-10-12
- Status: DONE — parent APPROVE

## Intent and current state

TimeInput currently enables auto-apply. Its deferred model watcher and conditional blur touch can leave validation behind the committed value. The user reports that selecting a time shows a required error and opening the picker again clears it. Confirmation must commit the form value before validation.

TimeInput.vue:38–48 watches internalValue without flush sync; :91 enables `auto-apply`; :75–78 contains `if (!wasUpdated) emit('validation:touch')`. datepicker-popup.spec.ts:132–138 only checks `picker.latest.autoApply` and does not prove validation ordering.

## Conventions and verification

Use pnpm, Vue script setup, and the existing component style. Write no code comments. Match `BaseInput.vue` scoped controlBindings and explicit validation event ownership. Tests must use real rendered behavior; read `.agents/skills/test-audit/SKILL.md`. Every new regression needs an observed baseline failure and a post-fix pass. Do not add a production seam for tests. Dependencies are already installed; do not install or upgrade them.

For browser setup, match `src/components/inputs/__tests__/DateInput.browser.spec.ts`: createApp, FrameworkPlugin, real components, cleanup afterEach. For DOM unit setup, use `src/components/core/__tests__/harness.ts`. Tests run from the package using the root pnpm filter below. No edits while Vitest is running.

## Scope

- `packages/loom/src/components/inputs/TimeInput.vue`
- `packages/loom/src/components/inputs/__tests__/datepicker-popup.spec.ts`
- `packages/loom/src/components/inputs/__tests__/TimeInput.browser.spec.ts`
- `packages/loom/vitest.browser.config.ts`
- This plan file and its status in `plans/README.md`

Out of scope: apps, API, Sprindle, dependency manifests, image ratio warnings, and unrelated framework changes. Do not change the common form validation policy to fix a picker timing defect. If the real picker requires changes to other production files, stop and report the exact event sequence.

## Drift check and git workflow

Run `git diff --stat 16e7b08..HEAD -- packages/loom/src/components/inputs/TimeInput.vue packages/loom/src/components/inputs/__tests__/datepicker-popup.spec.ts packages/loom/src/components/inputs/__tests__/TimeInput.browser.spec.ts packages/loom/vitest.browser.config.ts` first; expect no source drift. Compare current-state excerpts if it reports changes; stop on unexplained mismatch. Work on the current main checkout. The parent owns commit and push after review. Do not commit, push, merge, or write to external systems from the implementation agent.

## Steps and per-step gates

1. Read the installed @vuepic/vue-datepicker source and types for time-picker confirmation, model update, blur, clear, and action-row behavior. Read Form.vue and forms/useFormSession.ts touch/validation ownership. Add a real browser Form + required time schema regression using the existing DateInput.browser.spec.ts createApp/FrameworkPlugin pattern. Exercise empty submission, opening the picker, changing time without committing, confirming, clearing the required error without reopening, and submitting the exact confirmed value once. Register the new browser file in vitest.browser.config.ts. Show a baseline failure for the intended reason before editing production code. Verify with `pnpm --filter @southneuhof/loom test:browser -- src/components/inputs/__tests__/TimeInput.browser.spec.ts`; baseline must fail on absent confirmation or stale validation.
2. Disable immediate application through the existing picker API; keep the normal confirmation action. Update the public string model synchronously on committed picker updates. Emit validation touch on blur after the committed value is available. Avoid duplicate validation events, and preserve empty clearing, external model updates, disabled/required state, locale, defaultToCurrent, teleport, and BaseInput bindings. Do not change date, month, year, or range interaction behavior. Verify the same focused browser command passes.
3. Update the shared popup tests so TimeInput no longer expects autoApply=true or suppresses validation after its committed update. Keep other family expectations intact. Remove the misleading test that claims commit ordering while only checking a prop; the real browser test owns that regression. Verify `pnpm --filter @southneuhof/loom test -- src/components/inputs/__tests__/datepicker-popup.spec.ts` passes.

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

- Baseline regression: `pnpm --filter @southneuhof/loom test:browser -- src/components/inputs/__tests__/TimeInput.browser.spec.ts` failed because `.dp__action_select` was absent after empty submission and opening the picker. The test had already observed the required error.
- Timing regression: with confirmation still required, a temporary variant restored the deferred internal-value watcher and the old model-update/suppressed-blur-touch behavior. The browser test failed because the required error remained after confirmation. The source was restored before further tests.
- Post-fix browser command passed 17 included browser files and 79 tests. `pnpm --filter @southneuhof/loom test -- src/components/inputs/__tests__/datepicker-popup.spec.ts` passed 62 unit files and 500 tests.
- The real Form test selects hour `09` and minute `30`, verifies the controlled draft stays empty before confirmation, confirms, checks the error clears without reopening, and submits the exact `09:30:00` value once.
- Final batch gates and warnings are in `plans/README.md`. The browser command with a trailing file argument ran all configured browser specs in this workspace.

## STOP conditions

Stop and report if source assumptions drift, a verification gate fails twice after a reasonable repair, an out-of-scope edit is required, or a test cannot establish its stated contract. For a baseline that passes, report what it proves and revise the regression; do not fabricate a red result. Unavailable skills or repo-specific scripts referenced by test-audit must be reported; use this repository's actual commands and direct parent review, not unrelated tooling.

## Maintenance notes

Future updates to Vue fallthrough, Reka presence, VueDatePicker events, or BaseInput controlBindings must preserve the behavior established here. Avoid compatibility props and duplicate state. Record exact verification warnings and unverified cases in the completion report.

## Parent acceptance — 2026-10-12

Parent read the complete source and test diff and reran 502 unit tests, 79 browser tests, Loom types, contract diagnostics, and 34 architecture tests. All passed. Consumer type checking reproduces 10 diagnostics also observed with all six modified component sources restored to commit 16e7b08. This existing failure is an accepted verification deviation, not a passing consumer gate. Scope is clean; no added code comments. Direct review replaces unavailable autoreview. User authorized commit and push to origin/main.
