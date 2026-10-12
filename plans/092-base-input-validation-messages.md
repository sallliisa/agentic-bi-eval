# Plan 092: Make BaseInput render all validation messages

## Status

- Priority: P1
- Effort: L
- Risk: MED — control attributes and custom field slots must keep valid message links.
- Depends on: none
- Category: migration
- Planned at: commit `684589a`, 2026-10-12
- Implementation: complete; parent review pending
- Authorization: the user approved this target, plan writing, and implementation by GPT 6 Luna with max reasoning. Parent review is required. No commit, push, merge, or external write is authorized.

## Why this matters

Loom has two field validation message renderers. Form prints an error below each field. BaseInput prints an error inside its label block, above its default slot. Its helper flag and label conditions can hide both messages. An error also hides helper text. The user requires BaseInput to be the sole validation message renderer. Form can manage validation and supply messages, but it must not print validation text.

The user approved this order: label, control, helper text when provided, error text when present. Both messages must appear together. This applies to direct input use, managed forms, custom field slots, and validation issues that have no visible field. Form must delegate its validation summary to BaseInput as well.

## Drift check

Run `git diff --stat 684589a..HEAD -- packages/loom/src/components packages/loom/src/contracts/forms.ts packages/loom/src/renderers/formContracts.ts docs/ui/forms.md packages/loom/README.md docs/resource_system_overhaul/ARCHITECTURE.md apps/web/src/routes`.
Expected: no changes. If changes exist, compare the excerpts below with current code before implementation. Run `git status --short` and preserve unrelated work.

## Current state

- `packages/loom/src/components/inputs/BaseInput.vue:47` places the messages inside the label condition. At lines 55–60 it uses:

```vue
      <div v-if="enableHelperMessage && (helperMessage || error)">
        <label v-if="helperMessage && !error" class="text-sm text-on-surface/[67%]">{{ helperMessage }}</label>
        <label v-else :class="`text-sm text-error `">{{ error }}</label>
      </div>
    </div>
    <slot></slot>
```

- `packages/loom/src/components/core/Form.vue:238` passes `error` to each renderer. At lines 249–251 it also prints the same message:

```vue
          <p v-if="issueFor(field.key)" :id="`${session.formId}-error-${field.key}`" role="alert" class="text-sm leading-5 text-error">
            {{ issueFor(field.key) }}
          </p>
```

- `Form.vue:136` creates an `aria-describedby` reference to that paragraph. Authored references are merged and deduplicated. At lines 202–204 Form prints a summary for root issues and issues without a visible field. These issues must remain visible.
- `packages/loom/src/forms/useFormSession.ts:609` returns the first displayed issue for a field. Its displayed issues include local control errors subject to touched/submit state. Keep validation timing, issue choice, submit cancellation, and model conversion intact.
- `packages/loom/src/components/inputs/TextInput.vue:120` passes `enableHelperMessage ?? false`. The flag also exists in `commonprops.ts`, `textInput.types.ts`, LookupInput defaults and forwarding, `lookupInput.types.ts`, TableInput forwarding, and `tableInput.types.ts`.
- Most inputs use BaseInput. PasswordInput uses TextInput. CheckboxInput and TableInput suppress the BaseInput label, which currently hides messages. Switch is registered directly in `renderers/form.ts` and has no BaseInput. LocationInput DOES use BaseInput.
- Custom field slots receive `error` but Form prints the fallback message. Their scope type is in `contracts/forms.ts`. FormView and DialogForm forward these slots. Inspect the real slot consumers and type fixtures before changing this contract.
- FileInput and ImageInput forward `id` and `aria-*` from attributes to native file inputs. FileInput lines 48–52 show the current convention:

```ts
const controlAttrs = computed(() => Object.fromEntries(
  Object.entries(attrs).filter(([key]) => key === 'id' || key.startsWith('aria-')),
))
const wrapperAttrs = computed(() => Object.fromEntries(
  Object.entries(attrs).filter(([key]) => key === 'class' || key === 'style'),
))
```

- FileInput, ImageInput, and CameraInput also contain local invalid-asset text. Inspect whether each is a validation message or a recovery/action state. Validation text must use BaseInput; retain recovery actions and operational errors. Do not change asset values or upload behavior.
- `inputs/__tests__/base-input.spec.ts:23` currently expects helper text to be absent when an error exists. Update this obsolete behavior assertion and retain its focus-leave proof.
- The two login controls in `apps/web/src/routes/(public)/auth/login/index.route.vue:89` use the helper flag. Remove only the obsolete flags there.
- `docs/ui/forms.md:178` says the outer form owns error and help text. Update this guidance to match the new rendering ownership.

## Conventions and constraints

Use Vue 3 script setup, existing component props, and existing theme tokens. BaseInput already uses `text-error` and `text-on-surface/[67%]`; keep the established visual style. Use plain English in documentation. Add no code comments. Each new test must protect observable behavior or an independent contract; source-string and tautological tests are banned.

The current architecture says the component owns props, defaults, models, events, and native forwarding. Form owns editable drafts, managed bindings, validation, and submission. Wrapped controls put class and style on the wrapper and control attributes on the real focusable element. Preserve these boundaries. Read root AGENTS.md, DESIGN.md, and `docs/resource_system_overhaul/ARCHITECTURE.md` before editing. Use test-audit for changed tests. Use web-ui-surfaces for the small login caller migration.

## Scope

Allowed source changes, only as needed for this migration:

- `packages/loom/src/components/inputs/` — BaseInput, shared props/types, input forwarding, local validation rendering, and their tests.
- `packages/loom/src/components/composites/form-inputs/` — BaseInput forwarding and matching props/types.
- `packages/loom/src/components/composites/__tests__/` and `__type-tests__/` — affected slot/composite proof.
- `packages/loom/src/components/core/Form.vue` and `core/__tests__/` — message delegation and managed/custom-slot proof.
- `packages/loom/src/contracts/forms.ts`, `formControlBindings.ts`, and `contracts/index.ts` — typed custom slot bindings and their public export.
- `packages/loom/src/renderers/formContracts.ts` and its existing tests/type tests — ownership types and actual control forwarding proof if needed.
- `packages/loom/vitest.browser.config.ts` — include a focused real-editor browser test only if the existing browser files cannot own it cleanly.
- `packages/loom/src/components/views/FormView.vue`, `components/composites/DialogForm.vue`, and their existing tests — only if slot forwarding needs changes.
- `apps/web/src/routes/(public)/auth/login/index.route.vue` — remove the two helper flags only.
- `packages/loom/README.md`, `docs/ui/forms.md`, `docs/resource_system_overhaul/ARCHITECTURE.md` — current guidance for validation rendering and custom input authoring.
- This plan and its row in `plans/README.md` — implementation evidence and status.

Out of scope: Sprindle, API, SDK, resource declarations, validation algorithms, schemas, transport, route workflows, asset/upload algorithms, dependency changes, package upgrades, general input redesign, unrelated accessibility fixes, historical plans, and archived findings. Do not add compatibility aliases or a replacement helper flag. Do not add a second message renderer. Use the smallest shared mechanism required by the actual consumers.

## Commands

Run from the repository root. Dependencies are already installed; do not install or upgrade them.

| Purpose | Command | Expected |
|---|---|---|
| Focused message and Form tests | `pnpm --filter @southneuhof/loom test -- src/components/inputs/__tests__/base-input.spec.ts src/components/inputs/__tests__/text-input-surface.spec.ts src/components/core/__tests__/form.spec.ts` | All pass after implementation |
| Loom unit suite | `pnpm --filter @southneuhof/loom test` | All pass |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0 |
| Contract diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | Exit 0 |
| Browser suite | `pnpm --filter @southneuhof/loom test:browser` | All pass |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Surface architecture | `pnpm test:surface-architecture` | Exit 0 |
| Whitespace | `git diff --check` | Exit 0 |
| Flag removal | `rg -n 'enableHelperMessage|enable-helper-message' packages/loom/src apps/web/src --glob '!assets/**'` | No matches; rg exit 1 is success here |

If generated web type files change during the normal type check, inspect them and restore only task-created generated drift if it is unrelated. Do not overwrite pre-existing work. Do not install browsers without reporting that the existing browser environment is missing. Report pre-existing failures with exact commands and affected files; do not repair unrelated work.

## Git workflow

Work in the current checkout. Preserve all unrelated work. No commit, push, merge, PR, branch switch, or external write. The parent owns acceptance and final index status.

## Steps

### 1. Establish the behavior regression

Read the complete affected tests and their fixtures. Extend the BaseInput tests to require independent helper and error nodes after the control, with no label or helper flag. Retain touch behavior for internal focus movement and focus leaving the field. Add a managed-form regression that exercises a real registered input and proves one error with helper text visible. Use observable DOM and real input events, not component internals or snapshots of source.

Run the focused command. Before fixing source, record the expected failures caused by old label gating, helper suppression, or rendering position. Do not add duplicate tests at every wrapper layer.

### 2. Implement BaseInput message rendering and native bindings

Render helper and error nodes after the default control slot, independently of the label. Give error text suitable alert semantics. The helper and error need stable, distinct IDs. Merge their live IDs with authored `aria-describedby` values without duplication; do not leave a removed message ID referenced after text clears. The real control, not a layout wrapper, must receive the message links and invalid state. Preserve explicit control IDs and instance isolation. Keep label linkage correct where BaseInput owns a label.

Select a small typed binding mechanism that inputs and custom slots can consume. A scoped control slot is acceptable. Do not query or mutate arbitrary descendant DOM to apply bindings, clone arbitrary VNodes, or add a Form native-attribute allowlist. For TinyMCE only, the component may use the public editor handle and its DOMUtils attribute API to update its own iframe attributes as messages change. This specific library integration must keep the editor instance, draft, and focus; it must have real lifecycle proof. Use the actual native targets for third-party or composite controls. Do not widen public renderer types to arbitrary records to avoid contract errors.

Remove `enableHelperMessage` from BaseInput, shared props, public input types, defaults, and forwarding. Migrate the two login callers and affected test fixtures. Verify the flag-removal command and focused tests after the related call sites are updated.

### 3. Delegate Form field and summary messages

Remove the Form-owned field paragraph and its obsolete message-ID plumbing. Keep passing the selected issue to registered inputs. Registered inputs own their BaseInput composition; add it to Switch without adding a compatibility wrapper or changing its model/callback behavior.

For a custom `input:<key>` slot, delegate message rendering to BaseInput around the raw slot control. Supply typed bindings for the control ID, managed disabled/required state, and message attributes so the custom control can preserve label/error links. Keep existing value, draft, setter, error, touched, and validating scope semantics. State in documentation that custom slots provide controls and bind the supplied control attributes; avoid double message rendering by nesting a second message-bearing BaseInput.

For root issues or issues without a visible field, pass the existing summary text to BaseInput's error prop. BaseInput must render this summary even without a label or control slot. Form must have no direct validation text interpolation. This task does not move load failures or post-write operational alerts into field validation.

Verify focused tests and the Loom type check. Include custom slot and summary behavior in the focused Form proof. Hidden/unselected required values must still explain rejected submission.

### 4. Complete input coverage and current guidance

Trace all registered input renderers and direct inputs that emit validation errors. Use BaseInput for validation text. Add only the native forwarding needed for each message link; preserve native and component events, value conversion, focus touch, disabled state, and wrapper class/style. Preserve per-item recovery actions in asset controls. Remove duplicated validation text where a local invalid-asset state and managed issue describe the same error. Operational loader/upload/camera failures retain their current failure UI.

Update current Loom/UI/architecture guidance and slot examples. No historical plan rewrite. Run Loom units, diagnostics, types, browser tests, web types, surface architecture, and whitespace checks. Inspect the complete diff for scope and comments.

### 5. Record evidence and request parent review

Update this plan with steps completed, exact verification results, scope changes, and any blocked or unverified behavior. Mark the index IN PROGRESS — implementation complete, parent review pending. Send the parent a completion report with files changed, evidence, decisions, and unresolved issues. The parent must read the actual diff and perform missing verification before marking DONE.

## Test plan

- BaseInput owns message content/order, independent visibility, no-label cases, message clearing, stable distinct message IDs, and focus-leave events. Extend `inputs/__tests__/base-input.spec.ts`.
- Form owns real managed validation delivery, one message per field, helper/error coexistence, custom slot delivery, and summary for unmatched/root issues. Extend `core/__tests__/form.spec.ts`; use its mounted real Form harness.
- Browser proof owns links on real controls and managed/direct parity, including preservation of authored description IDs and current links after message updates. Extend `core/__tests__/Form.browser.spec.ts` and existing relevant input browser tests. Cover Switch and a label-suppressed composite at the most suitable mounted boundary. No invented source-grep tests.
- Asset tests retain invalid-value recovery and no lost upload/model behavior if those input templates change. Reuse the existing asset/input suites.
- Check removal of the flag through current types and callers. Do not add comments solely to build negative type tests.

## Done criteria

- All listed verification gates pass, or a documented pre-existing environment/baseline failure is reported to the parent for a decision.
- BaseInput is the sole validation text renderer; Form delegates visible-field, custom-slot, and unmatched/root messages.
- Helper text and error text appear as separate nodes after controls, together when both are provided, without a label requirement.
- The obsolete helper flag has no live source caller or public declaration.
- Message IDs are distinct across mounted fields/forms, links resolve to current messages, and authored references remain present.
- Real controls receive invalid state and descriptions. Existing model, events, validation timing, and focus touch behavior remain correct.
- Scope is clean, no code comments or compatibility aliases are added, and the parent records acceptance.

## Stop conditions

Stop and report if source drift changes the message paths, a repair requires out-of-scope changes, a gate fails twice after a focused repair, or there is no supported way to bind a third-party control's real native target. Report missing browser/dependency tooling without an install. Do not hide a failure with casts, broad prop bags, arbitrary descendant DOM mutation, or a second renderer.

## Parent review: revision 1

The parent approved the shared binding type and public export as necessary scope.
The existing registry proof can change its description assertion to include the
new message node. These are bounded extensions of the approved contract.

The first review requires these repairs before acceptance:

- Keep the default datepicker calendar affordance, placeholders, input mode,
  keyboard behavior, and focus behavior while using its supported input slot.
- Do not pass native required to every checkbox or every unnamed radio in a
  required group. Group requiredness must not change to all-options-required.
- FileManagerInput must pass its local error to BaseInput for direct use, not
  remove the old message without a replacement.
- TinyMCE must update live iframe links through its public editor handle and
  DOMUtils API. The narrow integration exception above replaces the initial
  blanket DOM-mutation restriction. This restriction was a plan choice, not a
  user rule. Add proof that links update without replacing the editor or text.
- LocationInput must use BaseInput's per-instance ID when no explicit ID is
  supplied, rather than force the same ID on multiple direct instances.

Add or extend behavior tests at the owning boundaries. Rerun affected checks
and report all results. Parent review remains pending.

## Implementation record

Implementation is complete. Parent review verdict: APPROVE.

- BaseInput owns separate helper and error nodes after its control. It creates
  distinct per-instance message IDs and passes typed control bindings to the
  real control. The bindings preserve authored description IDs and remove a
  cleared message ID.
- Form owns validation state. It no longer renders a field error paragraph.
  It delegates field, custom-slot, root, and unmatched-field messages to
  BaseInput. Raw input slots receive `controlBindings`. Switch now composes
  BaseInput. The helper flag has no live declaration or caller.
- Direct and wrapped controls forward message attributes to their native or
  focusable control. Date controls use a shared slot input that keeps the
  Datepicker input mode, read-only state, focus styling, placeholder, keyboard
  handlers, and calendar icon while forwarding current BaseInput bindings.
  Browser proof types a valid date and opens the calendar with its icon.
- TinyMCE keeps one editor instance and updates its own `iframeElement` through
  the public editor handle and DOMUtils `setAttribs`. The integration clears
  removed attributes and keeps authored descriptions. Browser proof checks
  current error/helper links, editor identity, content, focus, and unmount.
- Required checkbox groups keep group-level ARIA and do not mark every option
  required. Radio options share one name; only one option carries native
  required. A real browser form with `noValidate` false passes `checkValidity`
  when one option is selected in each group.
- FileManagerInput passes its direct local invalid-asset/provider message to
  BaseInput. Its selection trigger and recovery path remain available. Direct
  mounted tests use the existing asset and file-manager provider harness.
- LocationInput uses BaseInput's generated ID when no ID is authored and
  preserves explicit IDs. A mounted direct-use test checks two generated IDs
  and one explicit ID.
- File and image pickers keep native required unset on the hidden file input;
  Form still validates the value. Invalid-asset recovery actions remain.
- The source drift check at the start was clean. The exact baseline command
  `pnpm --filter @southneuhof/loom test -- src/components/inputs/__tests__/base-input.spec.ts src/components/inputs/__tests__/text-input-surface.spec.ts src/components/core/__tests__/form.spec.ts`
  ran all 62 Loom test files. It failed with four intended regressions among
  495 tests: the managed helper was missing, the label was not linked, a
  no-label control had no ID, and a required value did not reach a slotted
  control.
- The review regression command
  `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/Form.browser.spec.ts src/components/inputs/__tests__/DateInput.browser.spec.ts src/components/inputs/__tests__/RichTextInput.browser.spec.ts`
  failed before the review repairs with four intended failures in 3 files:
  one required choice did not satisfy native group validity, DateInput had no
  stock input mode, MonthInput lost its placeholder, and TinyMCE retained stale
  error ARIA after the error cleared. The direct-use command
  `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/composites/__tests__/LocationInput.spec.ts src/components/inputs/__tests__/FileInput.file-manager.spec.ts`
  failed before repairs with three intended failures in 2 files: duplicate
  generated LocationInput IDs and missing direct invalid-asset/provider
  messages.
- The final focused unit command
  `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/inputs/__tests__/base-input.spec.ts src/components/inputs/__tests__/text-input-surface.spec.ts src/components/core/__tests__/form.spec.ts src/components/inputs/__tests__/FileInput.file-manager.spec.ts src/components/composites/__tests__/LocationInput.spec.ts`
  passed 59 tests in 5 files. The focused browser command
  `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/Form.browser.spec.ts src/components/inputs/__tests__/DateInput.browser.spec.ts src/components/inputs/__tests__/RichTextInput.browser.spec.ts`
  passed 13 tests in 3 files.
- `pnpm --filter @southneuhof/loom test` passed 501 tests in 62 files.
  `pnpm --filter @southneuhof/loom type-check` passed. Contract diagnostics
  passed 29 Loom cases, 14 TypeScript surface cases, and 8 Vue surface cases.
  `pnpm --filter @southneuhof/loom test:browser` passed 75 tests in 15 files.
  `pnpm --filter @southneuhof/framework-web type-check` passed.
  `pnpm test:surface-architecture` passed 34 checks. `git diff --check`
  passed. The helper-flag search returned no matches (rg exit 1, expected).
- One first-pass Loom type check reported TS2353 for `data-test-id` on the
  shared Datepicker input. The attribute now uses the typed binding object and
  the final type check passes. One full browser run hit a TinyMCE selection
  error in the test's content-seeding command; the test now starts with real
  model content and checks it after the ARIA update. The final focused and full
  browser runs pass.
- Browser warnings remain for two DialogContent descriptions, TinyMCE's
  evaluation license, NumberInput placeholder/prefix handling, and a missing
  Vue Router route record. The browser suite passes. The web type check produced
  no tracked generated-file changes. No package or browser was installed.
- Parent review round 2 restored the three remaining stock calendar SVG paths
  and native `dp__icon` class, corrected the date input pointer class to match
  the non-text-input mode, and removed the duplicate TinyMCE import. The first
  focused rerun exposed a TinyMCE pre-init watcher call before DOMUtils was
  ready. The editor control now updates its iframe after the `init` event and
  watches bindings only for the initialized editor. The final focused command
  `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/inputs/__tests__/DateInput.browser.spec.ts src/components/inputs/__tests__/RichTextInput.browser.spec.ts`
  passed 5 tests in 2 files. `pnpm --filter @southneuhof/loom type-check`
  passed. `git diff --check` passed after this record was added. TinyMCE's
  evaluation-license warning remains.
- `$autoreview` was not available in the listed skills, tools, or repository
  scripts. Parent review remains the required acceptance step.

## Parent acceptance

The parent read the source and test diff, including the new typed bindings,
date control integration, and TinyMCE lifecycle adapter. Both review repair
rounds passed. BaseInput owns validation message markup; Form delegates field,
slot, and summary messages. Operational alerts retain their separate purpose.
The helper flag is absent from live code. No new code comments or compatibility
paths were found. The narrow library adapters keep current bindings on native
controls without a second renderer.

The parent reran these commands on the final source:

- `pnpm --filter @southneuhof/loom test`: 501 tests in 62 files passed.
- `pnpm --filter @southneuhof/loom test:browser`: 75 tests in 15 files passed.
- `pnpm --filter @southneuhof/loom type-check`: passed.
- `pnpm --filter @southneuhof/framework-web type-check`: passed.
- `pnpm --filter @southneuhof/loom test:diagnostics`: 29 Loom, 14 TypeScript,
  and 8 Vue cases passed.
- `pnpm test:surface-architecture`: 34 checks passed.
- `pnpm --filter @southneuhof/framework-web lint:focused -- 'src/routes/(public)/auth/login/index.route.vue'`:
  lint and formatting passed.
- `git diff --check`: passed.
- Helper-flag search: no live source matches.

The browser suite prints warnings for Dialog descriptions, NumberInput props,
TinyMCE evaluation licensing, and Vue Router test setup. No test failed.
`$autoreview` was unavailable; the parent performed the actual code and test
review. A tracked pre-existing browser attachment that the implementation
cleanup removed was restored from HEAD; it has no final diff. No unrelated
source change remains. No commit, push, or external write was made.

Plan 092 is DONE. After acceptance, the user authorized a local commit of this
migration. Push and merge remain unauthorized.

## Maintenance notes

Future input renderers must compose BaseInput and forward its message bindings to their controls. A custom slot must use its supplied bindings. Keep one owner for message markup and one owner for validation state. Review message lifecycle when a field is hidden, remounted, reset, or switches renderer. The user selected helper-before-error order and summary delegation to BaseInput; these are the approved current targets.
