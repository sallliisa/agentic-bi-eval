# Plan 095: Route switch attributes to the button

## Status

- Priority: P2
- Effort: S
- Risk: LOW
- Depends on: Plan 092 (DONE); no dependency on other plans in this batch
- Category: migration / correctness
- Planned at: commit `16e7b08`, 2026-10-12
- Status: DONE — parent APPROVE

## Intent and current state

Applications need IDs, native names, accessibility attributes, and data attributes on the interactive button. Wrapper styling must stay on BaseInput. Expose checked state with switch semantics while retaining callbacks and validation messages.

Switch.vue:114–135 binds BaseInput controlBindings to a button but defines no role or aria-checked. It relies on implicit attribute fallthrough. Arbitrary name, aria-* and data-* attributes therefore go to the wrapper.

## Conventions and verification

Use pnpm, Vue script setup, and the existing component style. Write no code comments. Match `BaseInput.vue` scoped controlBindings and explicit validation event ownership. Tests must use real rendered behavior; read `.agents/skills/test-audit/SKILL.md`. Every new regression needs an observed baseline failure and a post-fix pass. Do not add a production seam for tests. Dependencies are already installed; do not install or upgrade them.

For browser setup, match `src/components/inputs/__tests__/DateInput.browser.spec.ts`: createApp, FrameworkPlugin, real components, cleanup afterEach. For DOM unit setup, use `src/components/core/__tests__/harness.ts`. Tests run from the package using the root pnpm filter below. No edits while Vitest is running.

## Scope

- `packages/loom/src/components/inputs/Switch.vue`
- `packages/loom/src/components/inputs/__tests__/Switch.spec.ts`
- This plan file and its status in `plans/README.md`

Out of scope: apps, API, Sprindle, dependency manifests, image ratio warnings, and unrelated framework changes. Do not add a generic attribute forwarding framework, compatibility props, hidden submission inputs, or change the boolean model contract.

## Drift check and git workflow

Run `git diff --stat 16e7b08..HEAD -- packages/loom/src/components/inputs/Switch.vue packages/loom/src/components/inputs/__tests__/Switch.spec.ts` first; expect no source drift. Compare current-state excerpts if it reports changes; stop on unexplained mismatch. Work on the current main checkout. The parent owns commit and push after review. Do not commit, push, merge, or write to external systems from the implementation agent.

## Steps and per-step gates

1. Add a focused rendered Switch test with authored id, name, aria-label, aria-describedby, data attribute, class, style, helper, and error. Assert attributes on the real button, styling on the wrapper, and both generated message IDs in its description. Assert role=switch and checked state before/after toggle; disabled prevents model/callback changes. Use core/__tests__/harness mountCore rather than new test seams. Verify `pnpm --filter @southneuhof/loom test -- src/components/inputs/__tests__/Switch.spec.ts` fails for missing native attributes/semantics on baseline.
2. Use explicit inheritAttrs=false and useAttrs with simple reactive attribute partitioning. Pass class/style to BaseInput; pass id and BaseInput-owned ARIA props to BaseInput so it merges descriptions and derives error state. Forward name, other aria-* and data-* to the button. Apply authoritative controlBindings after authored native attrs; apply role=switch and aria-checked from the model. Preserve button type, disabled guard, onToggle/onActive/onDeactive, label/description, and helper/error output. Give the switch an accessible name from its visible label/description unless authored ARIA supplies one. Explicitly forward validation:touch once from BaseInput. Verify the focused test passes.

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

- Baseline regression: `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/inputs/__tests__/Switch.spec.ts` failed because the button's `name` was empty instead of `emailAlerts`.
- The same focused test passed after the change. It checks native attributes, wrapper class/style, helper and error descriptions, switch checked state, accessible names, one validation touch, callbacks, and disabled behavior.
- The full Loom unit gate passed 64 files and 502 tests. Final batch gates and warnings are in `plans/README.md`.

## STOP conditions

Stop and report if source assumptions drift, a verification gate fails twice after a reasonable repair, an out-of-scope edit is required, or a test cannot establish its stated contract. For a baseline that passes, report what it proves and revise the regression; do not fabricate a red result. Unavailable skills or repo-specific scripts referenced by test-audit must be reported; use this repository's actual commands and direct parent review, not unrelated tooling.

## Maintenance notes

Future updates to Vue fallthrough, Reka presence, VueDatePicker events, or BaseInput controlBindings must preserve the behavior established here. Avoid compatibility props and duplicate state. Record exact verification warnings and unverified cases in the completion report.

## Parent acceptance — 2026-10-12

Parent read the complete source and test diff and reran 502 unit tests, 79 browser tests, Loom types, contract diagnostics, and 34 architecture tests. All passed. Consumer type checking reproduces 10 diagnostics also observed with all six modified component sources restored to commit 16e7b08. This existing failure is an accepted verification deviation, not a passing consumer gate. Scope is clean; no added code comments. Direct review replaces unavailable autoreview. User authorized commit and push to origin/main.
