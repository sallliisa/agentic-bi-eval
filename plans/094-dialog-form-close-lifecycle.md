# Plan 094: Keep the form through dialog close animation

## Status

- Priority: P1
- Effort: M
- Risk: MED
- Depends on: Plan 092 (DONE); no dependency on other plans in this batch
- Category: migration / correctness
- Planned at: commit `16e7b08`, 2026-10-12
- Status: DONE — parent APPROVE

## Intent and current state

Closing must retain the visible form through the dialog exit animation. Each opening must start a fresh form session, including reopening during an exit animation. Preserve controlled drafts, close authorization, and stale async ownership safeguards.

DialogForm.vue:113–118 watches visibility but does not change the form mount key on opening. :248–249 renders `<Form v-if="open" :key="formMountGeneration">`. base/Dialog/DialogContent.vue delegates presence to Reka and has closed-state animation classes. Existing DialogForm.spec.ts mocks remove dialog content immediately.

## Conventions and verification

Use pnpm, Vue script setup, and the existing component style. Write no code comments. Match `BaseInput.vue` scoped controlBindings and explicit validation event ownership. Tests must use real rendered behavior; read `.agents/skills/test-audit/SKILL.md`. Every new regression needs an observed baseline failure and a post-fix pass. Do not add a production seam for tests. Dependencies are already installed; do not install or upgrade them.

For browser setup, match `src/components/inputs/__tests__/DateInput.browser.spec.ts`: createApp, FrameworkPlugin, real components, cleanup afterEach. For DOM unit setup, use `src/components/core/__tests__/harness.ts`. Tests run from the package using the root pnpm filter below. No edits while Vitest is running.

## Scope

- `packages/loom/src/components/composites/DialogForm.vue`
- `packages/loom/src/components/composites/__tests__/DialogForm.spec.ts`
- `packages/loom/src/components/composites/__tests__/DialogForm.managed.spec.ts`
- `packages/loom/src/components/composites/__tests__/DialogForm.browser.spec.ts`
- `packages/loom/vitest.browser.config.ts`
- This plan file and its status in `plans/README.md`

Out of scope: apps, API, Sprindle, dependency manifests, image ratio warnings, and unrelated framework changes. Do not change base Dialog animation classes, close policy, dirty confirmation, or Form state semantics. Stop if presence cannot retain content without changing base Dialog.

## Drift check and git workflow

Run `git diff --stat 16e7b08..HEAD -- packages/loom/src/components/composites/DialogForm.vue packages/loom/src/components/composites/__tests__/DialogForm.spec.ts packages/loom/src/components/composites/__tests__/DialogForm.managed.spec.ts packages/loom/src/components/composites/__tests__/DialogForm.browser.spec.ts packages/loom/vitest.browser.config.ts` first; expect no source drift. Compare current-state excerpts if it reports changes; stop on unexplained mismatch. Work on the current main checkout. The parent owns commit and push after review. Do not commit, push, merge, or write to external systems from the implementation agent.

## Steps and per-step gates

1. Add a real DialogForm browser regression using FrameworkPlugin and real Reka Dialog. Supply deterministic animation CSS in test setup only. Close after editing, assert form content remains during the closed animation, then dispatch animation completion or observe completion and assert removal. Reopen during closing and assert a fresh unbound draft and touched/error state; also cover controlled draft retention. Do not create a production test hook. Register the browser file. Verify `pnpm --filter @southneuhof/loom test:browser -- src/components/composites/__tests__/DialogForm.browser.spec.ts` fails on baseline for premature form removal.
2. Let dialog presence own Form unmounting; remove the open-only Form gate. Increment the mount generation when a closed dialog opens so reopening during exit creates a fresh session. Preserve existing key changes for modelValue binding presence. Keep generation and ownership checks effective when old async work resolves after close or reopen. Inspect event closures carefully: old sessions must not report completion as a new session. Verify the focused browser command passes.
3. Extend existing managed/unit tests only for distinct stale completion or close-guard risks not covered by browser lifecycle proof. Verify `pnpm --filter @southneuhof/loom test -- src/components/composites/__tests__/DialogForm` passes.

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

- Baseline regression: `pnpm --filter @southneuhof/loom test:browser -- src/components/composites/__tests__/DialogForm.browser.spec.ts` failed in both cases. During Reka's `data-state="closed"` animation, `[role="dialog"] form` was absent at the assertions for unbound and controlled drafts.
- After the change, the same command passed 17 included browser files and 79 tests. The new test supplies a 60-second exit animation in test CSS, checks the form during exit, reopens before exit completes, verifies a fresh unbound session and retained controlled draft, then dispatches `animationend` and observes removal.
- The full Loom unit gate passed 64 files and 502 tests, including the existing managed late-save ownership regression.
- The existing DialogForm `dialogGeneration` and Form session ownership guards remain in place. The managed late-save test resolves a closed session's save after a new session opens and verifies that the old result neither emits nor affects the new dialog. No second async regression was needed.
- Final batch gates and warnings are in `plans/README.md`. The browser command with a trailing file argument ran all configured browser specs in this workspace.

## STOP conditions

Stop and report if source assumptions drift, a verification gate fails twice after a reasonable repair, an out-of-scope edit is required, or a test cannot establish its stated contract. For a baseline that passes, report what it proves and revise the regression; do not fabricate a red result. Unavailable skills or repo-specific scripts referenced by test-audit must be reported; use this repository's actual commands and direct parent review, not unrelated tooling.

## Maintenance notes

Future updates to Vue fallthrough, Reka presence, VueDatePicker events, or BaseInput controlBindings must preserve the behavior established here. Avoid compatibility props and duplicate state. Record exact verification warnings and unverified cases in the completion report.

## Parent acceptance — 2026-10-12

Parent read the complete source and test diff and reran 502 unit tests, 79 browser tests, Loom types, contract diagnostics, and 34 architecture tests. All passed. Consumer type checking reproduces 10 diagnostics also observed with all six modified component sources restored to commit 16e7b08. This existing failure is an accepted verification deviation, not a passing consumer gate. Scope is clean; no added code comments. Direct review replaces unavailable autoreview. User authorized commit and push to origin/main.
