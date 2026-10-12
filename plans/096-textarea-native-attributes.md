# Plan 096: Route textarea attributes to the native control

## Status

- Priority: P2
- Effort: S
- Risk: LOW
- Depends on: Plan 092 (DONE); no dependency on other plans in this batch
- Category: migration / correctness
- Planned at: commit `16e7b08`, 2026-10-12
- Status: DONE — parent APPROVE

## Intent and current state

Native textarea options must reach the native control. Wrapper class/style stays on BaseInput, and validation touch must be a declared forwarded event. The previous migration already supplies required, disabled, IDs, and validation ARIA through controlBindings.

TextareaInput.vue:27–30 declares only validation:error. Its template binds props to BaseInput and controlBindings to textarea, while undeclared attributes fall through to the wrapper. Model conversion already uses flush sync; preserve it.

## Conventions and verification

Use pnpm, Vue script setup, and the existing component style. Write no code comments. Match `BaseInput.vue` scoped controlBindings and explicit validation event ownership. Tests must use real rendered behavior; read `.agents/skills/test-audit/SKILL.md`. Every new regression needs an observed baseline failure and a post-fix pass. Do not add a production seam for tests. Dependencies are already installed; do not install or upgrade them.

For browser setup, match `src/components/inputs/__tests__/DateInput.browser.spec.ts`: createApp, FrameworkPlugin, real components, cleanup afterEach. For DOM unit setup, use `src/components/core/__tests__/harness.ts`. Tests run from the package using the root pnpm filter below. No edits while Vitest is running.

## Scope

- `packages/loom/src/components/inputs/TextareaInput.vue`
- `packages/loom/src/components/inputs/__tests__/TextareaInput.spec.ts`
- This plan file and its status in `plans/README.md`

Out of scope: apps, API, Sprindle, dependency manifests, image ratio warnings, and unrelated framework changes. Do not change the constraint API, numeric conversion policy, BaseInput, or other controls. Do not duplicate native attrs or event listeners on wrapper and control.

## Drift check and git workflow

Run `git diff --stat 16e7b08..HEAD -- packages/loom/src/components/inputs/TextareaInput.vue packages/loom/src/components/inputs/__tests__/TextareaInput.spec.ts` first; expect no source drift. Compare current-state excerpts if it reports changes; stop on unexplained mismatch. Work on the current main checkout. The parent owns commit and push after review. Do not commit, push, merge, or write to external systems from the implementation agent.

## Steps and per-step gates

1. Add rendered native attribute regression coverage using mountCore. Supply id, name, maxlength, autocomplete, aria-label, authored descriptions, data attributes, class/style, disabled and required. Assert native placement, wrapper styling, current helper/error links, and one validation:touch from focus leaving the component. Cover a numeric constraint only if existing coverage lacks its distinct conversion risk. Verify `pnpm --filter @southneuhof/loom test -- src/components/inputs/__tests__/TextareaInput.spec.ts` fails on baseline for misplaced native attrs.
2. Partition attributes explicitly with inheritAttrs=false and useAttrs. Send class/style and BaseInput-owned id/description/invalid/required ARIA to BaseInput; send relevant native textarea attrs and listeners to textarea. Keep authored ARIA merged through BaseInput and bind controlBindings authoritatively. Declare and forward validation:touch exactly once. Preserve rows, placeholder, action slot, constraint handling and validation:error, synchronous model conversion, external updates, disabled/required. Verify focused tests pass.

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

- Baseline regression: `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/inputs/__tests__/TextareaInput.spec.ts` failed because the textarea's `name` was empty instead of `messageBody`.
- Post-fix focused checks passed: `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/inputs/__tests__/TextareaInput.spec.ts src/components/inputs/__tests__/text-input-surface.spec.ts` — 2 files and 16 tests.
- The new rendered test checks native attributes and listeners on the textarea, wrapper class/style, required/disabled controls, helper/error descriptions, model updates, and one validation touch. The existing numeric conversion cases also passed.
- Final batch gates and warnings are in `plans/README.md`.

## STOP conditions

Stop and report if source assumptions drift, a verification gate fails twice after a reasonable repair, an out-of-scope edit is required, or a test cannot establish its stated contract. For a baseline that passes, report what it proves and revise the regression; do not fabricate a red result. Unavailable skills or repo-specific scripts referenced by test-audit must be reported; use this repository's actual commands and direct parent review, not unrelated tooling.

## Maintenance notes

Future updates to Vue fallthrough, Reka presence, VueDatePicker events, or BaseInput controlBindings must preserve the behavior established here. Avoid compatibility props and duplicate state. Record exact verification warnings and unverified cases in the completion report.

## Parent acceptance — 2026-10-12

Parent read the complete source and test diff and reran 502 unit tests, 79 browser tests, Loom types, contract diagnostics, and 34 architecture tests. All passed. Consumer type checking reproduces 10 diagnostics also observed with all six modified component sources restored to commit 16e7b08. This existing failure is an accepted verification deviation, not a passing consumer gate. Scope is clean; no added code comments. Direct review replaces unavailable autoreview. User authorized commit and push to origin/main.
