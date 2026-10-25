# Plan 105: Let form schemas define draft and output without a mode

## Status

- Priority: P1
- Effort: M
- Risk: MED — public types and compiled fixtures change together.
- Category: migration / API simplification
- Depends on: none
- Planned at: `5be952c2881c82f5fa052afd4cb98188b8aa1964`, 2026-10-25
- Status: DONE — parent approved source after independent checks; direct main publication is authorized and reported in the task result.

## Why this matters

The user stopped an HK Shield Loom update to remove the explicit custom-draft
distinction first. A schema already describes editable input and parsed output.
Requiring a mode when their top-level keys differ adds configuration without
proving the transform is correct. Allow such transforms directly while keeping
input field/default checks, parsed submit typing, resource receipt checks, and
field-binding safeguards. This interim task changes Carta's Loom and its guides.
The HK Shield migration stays on hold.

## Current state

The working tree is clean on Carta main. `origin/main` matches the planned SHA.
Loom is source-based, version 2.0.0. No dependency version change is required.
The package sync workflow publishes package branches after a main push; the
parent must not manually publish all packages.

- `packages/loom/src/forms/defineForm.ts:16-25` defines ChangedSchemaKeys and
  FormDraftMode. The latter requires `mode: 'custom-draft'` for changed keys.
- `defineForm.ts:218-224` repeats the condition in DefinedForm's returned type.
- `defineForm.ts:265-270` intersects FormArgument with FormDraftMode.
- `defineForm.ts:299` copies definition.mode into returned configuration.
- `src/contracts/forms.ts:158` and `src/forms/definitionTypes.ts:21` expose the mode.
- `src/forms/assertFormDefinition.ts:6,64` allows and validates the mode.
- `src/forms/useFormSession.ts:149` forwards the mode to runtime validation.
- `scripts/check-contract-diagnostics.mjs:178-190` treats renamed, added, and
  removed output keys as errors without the flag. Its later default cases
  independently protect field defaults and resource operation inference.
- Existing Zod 3/4 fixtures in `src/contracts/__type-tests__/surface-definitions.type-test.ts`
  and `src/renderers/__type-tests__/form-contracts.type-test.ts` already assert
  separate input/output types. TableInput fixtures exercise a label-to-name
  transform with explicit toDraft and currently carry the flag.

Exemplar: the TableInput browser fixture defines
`z.object({ id: z.string(), label: z.string().min(1) }).transform(({ id, label }) => ({ id, name: label }))`.
It opens the editor with label values and checks that saved rows contain name.
Remove its mode and preserve this behavior and its toDraft mapping.

The two current guides are `docs/ui/forms.md:43-45` and
`docs/resource_system_overhaul/ARCHITECTURE.md:152`. They require matching keys
or the mode. Replace that rule with the input/draft/output ownership contract.
Keep field bindings for one control editing multiple schema keys; they are a
separate capability. Do not infer reverse transforms or rename backend fields.

## Scope

All paths below are relative to packages/loom unless rooted otherwise:

- src/forms/defineForm.ts
- src/forms/definitionTypes.ts
- src/forms/assertFormDefinition.ts
- src/forms/useFormSession.ts
- src/contracts/forms.ts
- src/contracts/__type-tests__/surface-definitions.type-test.ts
- src/renderers/__type-tests__/form-contracts.type-test.ts
- src/components/composites/__type-tests__/table-input.type-test.ts
- src/components/composites/__type-tests__/table-input-component.type-test.vue
- src/components/composites/__tests__/TableInput.spec.ts
- src/components/composites/__tests__/TableInput.browser.spec.ts
- src/forms/__tests__/defineForm.spec.ts, only if a missing runtime invariant needs proof
- scripts/check-contract-diagnostics.mjs
- root docs/ui/forms.md
- root docs/resource_system_overhaul/ARCHITECTURE.md
- root plans/105-remove-explicit-form-draft-mode.md and plans/README.md

Out of scope: HK Shield source/skills/plans, backend/Sprindle, unrelated app
code, dependency or lockfile changes, other framework APIs, CI changes, database
operations, credentials, manual package publication, and all unrelated work.
The parent owns plan/index status and Git commit/push. The worker edits source,
fixtures, and the two guides only. No recursive delegation or Git writes.

## Git workflow

Use the current Carta checkout at /Users/gamer/Documents/projects/carta.
Drift check: `git diff --stat 5be952c..HEAD -- packages/loom docs/ui/forms.md docs/resource_system_overhaul/ARCHITECTURE.md`.
If relevant code changed, read the new diff and report a conflict that changes
this contract. Preserve unrelated work. The user authorized a direct push to
origin/main after review. The parent stages only this task's files, commits,
and pushes normally. No force push or broad package publication.

## Steps

### 1. Remove the mode contract

Remove ChangedSchemaKeys, FormDraftMode, returned-type mode requirements, public
mode properties, configuration copying, runtime allowlist membership/validation,
and session forwarding. Remove all current fixture uses. Leave no compatibility
alias or ignored mode option. Keep finite schema checks, field renderer/model
checks, initialValue checks, binding checks, submit output inference, and resource
identity/error diagnostics unchanged.

Verify: `rg -n 'custom-draft|FormDraftMode|ChangedSchemaKeys|__formSchemaChangesKeys|definition\.mode|props\.mode' packages/loom/src packages/loom/scripts`
returns no obsolete active contract after fixture changes, except the literal
removed value in the negative JavaScript definition test. Search the remaining mode
references to separate unrelated dialog/asset concepts. No code comments added.

### 2. Prove transforms and retained safety

Update existing compiled fixtures so renamed/added/removed output keys work
without a mode, including defineForm spread/reconstruction. Cover both a
submit-free form and a form with submit inferred from parsed output. Keep the
existing TableInput conversion and mapped edit-loader proof.

Replace the three obsolete negative key-change cases in the diagnostics harness
with cases that accept transforms and reject an independent wrong field/default
or submit argument at the actual contract boundary. A type acceptance alone
must not weaken the other negative fixtures. Prefer the current fixtures over
new files, source-text assertions, or repeated type assertions.

Use the test-audit authoring gate in .agents/skills/test-audit/SKILL.md. Each test
must protect an observable behavior or an independent static contract. Existing
TableInput browser proof checks real edit and transformed save behavior. Add a
mounted Form test only for a distinct uncovered invariant. If adding a runtime
test, use the harness in src/forms/__tests__/defineForm.spec.ts and verify schema
input validation, retained draft, and the actual parsed value sent to submit.
No new test-only production seams. Do not edit tests while Vitest runs.

Verify: focused Loom tests, package type check, and diagnostics all pass using
the commands below. Existing negative binding/default/renderer/receipt checks
must continue to fail for their intended reasons in the diagnostic harness.

### 3. Update the authoring guides

State: fields, defaults, controlled values, and edit loaders use schema input;
submit receives parsed output; submitted events report the callback result.
Transforms may change keys.
Record-to-draft mapping stays explicit; Loom does not invert a transform.
Keep validation issue paths tied to editable input where a field error is needed.
Remove the mode requirement from both guides without adding a replacement flag.
Other frontend skills already point to these contracts and need no duplicate rule.

Verify: no obsolete mode guidance in current packages/loom, docs/ui, or the
architecture guide; the surface architecture gate passes.

### 4. Complete checks and report for parent review

Run all relevant gates below and read the resulting diff. Report exact commands,
results/counts, source versus test changes, and any unverified behavior. Do not
claim CI or remote package publication before it occurs. The parent will review
actual files, repeat checks as needed, update plan/index, and commit/push.

## Commands and expected results

Run from repo root unless the command changes cwd.

| Purpose | Command | Expected |
|---|---|---|
| Focused runtime | `pnpm --filter @southneuhof/loom exec vitest run src/forms/__tests__/defineForm.spec.ts src/forms/__tests__/fieldBinding.spec.ts src/components/composites/__tests__/TableInput.spec.ts` | Exit 0, all pass |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Contract diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | All valid declarations compile; invalid declarations fail at named boundaries |
| App transport diagnostics | `node packages/loom/scripts/check-contract-diagnostics.mjs --project app` | Exit 0 |
| Full Loom runtime | `pnpm --filter @southneuhof/loom test` | All pass |
| Full Loom browser | `pnpm --filter @southneuhof/loom test:browser` | All pass; disclose missing browser prerequisites |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Web unit tests | `pnpm --filter @southneuhof/framework-web test` | All pass; disclose skips |
| Web build | `pnpm --filter @southneuhof/framework-web build-only` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |
| Diff | `git diff --check` | Exit 0; allowed files only |

The existing CI web-validation workflow uses these package/type/diagnostic/
browser/build gates. Use installed dependencies first. Report unavailable
prerequisites; do not alter versions or weaken checks to bypass them.

## Done criteria

- [x] Form schemas can add, remove, or rename top-level output keys without a mode.
- [x] Public and runtime form definitions have no custom-draft mode contract.
- [x] Input/default/renderer/binding and submit/receipt checks remain effective.
- [x] Existing converted row edit/save browser proof passes without the flag.
- [x] Current guides agree with the new input/output contract.
- [x] All applicable gates above pass; failures/skips are explicit.
- [x] Parent reviews source and tests, then updates this plan/index.
- [x] Parent approves the scoped change for direct main publication; the task result records the push outcome.

## Stop conditions and maintenance

Report a required source change outside the allowlist, a semantic conflict with
input/output ownership, unrelated dirty work, or a check that needs credentials,
a live database mutation, or relaxed validation. Continue independent authorized
work where possible. Never modify HK Shield during this interim task.
Future schema changes must preserve input-owned editing and parsed submission.
Field bindings remain useful for multi-key control models without implying a
separate form mode. This is a selected change, not a full framework audit.

## Parent acceptance — 2026-10-25

Verdict: APPROVE. GPT 6 Luna at max reasoning implemented the scoped change.
The parent read the complete source, fixture, diagnostics, and guide diff.
One revision made the negative test use the literal removed option and required
an actual input-field diagnostic. The old flag is removed from active types,
constructor/runtime configuration, and session forwarding. Its only source
occurrence is a JavaScript rejection test. No compatibility layer was added.

The parent corrected the plan's event wording: submit receives parsed schema
output, while submitted reports the callback result. The event API is unchanged.

Independent parent verification, on final source:

| Check | Result |
|---|---|
| Loom nonincremental types | PASS |
| Loom contract diagnostics | PASS — 46 contract, 14 TypeScript surface, 8 Vue cases |
| Web transport diagnostics | PASS — 4 cases |
| Loom unit tests | PASS — 66 files, 549 tests |
| Loom browser tests | PASS — 17 files, 87 tests |
| Web type check | PASS |
| Web unit tests | PASS — 48 files, 252 tests |
| Web production build | PASS |
| Surface architecture | PASS — 34 tests and source gate |
| Module tooling | PASS — 81 tests |
| Diff and scope | PASS — only the 17 declared files |

Warnings include Node localStorage notices, Vue/dependency browser notices,
Vitest configuration deprecations, and the Web chunk-size/plugin timing notices.
No check failed and no skipped tests were reported. The worker's first valid
fixture check exposed renderer-literal widening; its correction and final
checks passed. No dependency changes, backend work, or HK Shield changes were
made. The test-audit skill's external autoreview tool is not available; the
parent performed the required source and test review directly.

Every delegation wait used timeout_ms 3600000. After the user asked to stop
interim updates, the worker received a final-report-only instruction. The
parent waited for final completion before reading its implementation.
