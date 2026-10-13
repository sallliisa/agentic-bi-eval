# Plan 100: Keep confirmed writes distinct from failed refreshes

## Status

- Status: DONE — parent APPROVE, 2026-10-14. Priority: P1. Effort: L. Risk: HIGH. Confidence: HIGH.
- Category: correctness. Planned at: `f507f5e`, 2026-10-13.
- Depends on: Plan 099. Extends the completed Plans 061 and 076; it does not replace their mounted-session guards.
- The user authorized implementation with GPT-6 Luna at max reasoning. No commit, push, install, package promotion, API/database change, or external write.


## Final parent review — APPROVE, 2026-10-14

Status: **DONE**. The parent wrote the plans and their exact contracts,
assigned implementation to GPT-6 Luna at max reasoning, reviewed the actual
source and test diff, reconciled the fixture failure, and owns this approval.
The worker wrote implementation code and tests. No commit or push was made.

The final diff meets the selected contract and scope. Read feedback uses the
existing loader and query client. Confirmed write recovery runs reads only;
uncertain writes stay blocked for the same mounted target. Delete completion
settles its captured outcome before checking the current view. Resource
sorting uses the loader query type and retains runtime parsing. HTTP tests
use real mounted views, resource binding, Hono transport, and QueryClient.
Expected setup errors are captured and the test apps unmount normally.
Unrelated test formatting was removed. No code comments, compatibility
aliases, new input, command presentation, generator, or schema copy was added.

Parent verification on the final source:

| Gate | Result | Evidence in `plans/loom-feedback-evidence/` |
|---|---|---|
| Loom unit | PASS: 64 files, 529 tests | `parent-final-accepted-unit.log` |
| Loom browser | PASS: 17 files, 79 tests | `parent-accepted-browser.log` |
| Loom types | PASS: exit 0, nonincremental compiler | `parent-final-accepted-loom-types.log` |
| App types | PASS: exit 0 | `parent-final-accepted-web-types.log` |
| Contract diagnostics | PASS: 35 Loom, 14 TypeScript, 8 Vue cases | `parent-accepted-diagnostics.log` |
| Surface architecture | PASS: 34 checks | `parent-accepted-architecture.log` |
| HTTP/action/normalizer owners | PASS: 3 files, 27 tests, including 7 HTTP integration cases | `parent-accepted-http.log` |
| App focused lint | PASS: 5 files, no warnings | `parent-accepted-lint.log` |
| Diff hygiene and code comment scan | PASS | Parent checked final diff directly |

The last correction changed only the view test fixtures and formatting. The
parent reran full Loom unit and both type checks after it; other parent gates
retain their unchanged-source evidence. The HTTP regression fails in five
intended cases on clean HEAD `f507f5e`; cancellation and definite rejection
controls pass. See `parent-http-red-baseline.log`. Both stale-owner regression
cases failed before their fix; see `list-delete-stale-owner-red.log`.

The full app suite remains a known baseline failure: seven route tests and
three suite import errors. The same failures reproduce from clean HEAD in
`app-unit-baseline.log`; the full working-tree run is
`parent-final-app-unit.log`. They are outside this selected scope. No new app
type failures remain. The unavailable test-audit auxiliary commands were not
claimed as run. Earlier STOPPED and BLOCKED records below describe prior
passes; this parent verdict is the final status.

## Why this matters

A rejected write can be corrected and submitted again. A lost write response cannot safely be repeated. A confirmed write followed by a failed read is already saved and needs a read retry. Current metadata and UI combine the latter two outcomes, and actual HTTP refresh failures can be hidden by the query client.

## Current state

`packages/loom/src/resources/bindResource.ts:269`:

```ts
type ResourcePostWriteCode = 'RESOURCE_RESULT_INVALID' | 'RESOURCE_POST_WRITE_INVALIDATION_FAILED'
class ResourcePostWriteError extends Error {
  readonly retryable = false
  readonly postWrite = true
}
```

`bindResource.ts:290` awaits resource invalidation after a returned write and throws a post-write error on failure. Create/update validate result identity first. Delete and custom commands follow the same invalidation owner. `query/client.ts:45` calls invalidateQueries without throwOnError; the installed query-core source catches refetch errors by default. Ordinary lifecycle cancellation is not a failed write.

`forms/useFormSession.ts:548` normalizes failures, stores postWrite errors, blocks repeat submits, and reports an error. `components/core/Form.vue:205` always says the save may have completed. ListView retains per-resource/identity delete errors and supplies guarded slot callbacks. FormView already separates navigation failure from a successful write.

`apps/web/src/framework/hono/actions.ts:33` wraps rejected transport promises as ordinary invocation errors. Its payload parser loses the distinction between an HTTP rejection and a response that could not be read. Both existing normalizers preserve code, operation, retryable, and postWrite. Extend them consistently.

## Exact contract

Keep successful operation return values as domain results. Do not add a public result envelope, compatibility wrapper, global mutation manager, automatic write retry, or guessed identity.

Extend the existing normalized SubmitError with:

```ts
writeOutcome?: 'uncertain' | 'confirmed'
result?: unknown
refresh?: () => Promise<void>
```

These fields describe post-write completion only. Preserve existing postWrite and retryable fields because existing mounted guards consume them. A confirmed refresh error must contain an own `result` property, including when the successful delete result is undefined, and a read-only recovery callback. Preserve them through both normalizers. The resource binder owns result validation and produces the confirmed metadata; never infer confirmation from message text or from an arbitrary normalized error alone.

| Outcome | Classification and required behavior |
|---|---|
| Validation/access failure before dispatch or definite HTTP rejection | Ordinary error; retain field issues and allow deliberate correction/retry |
| Rejected write transport promise, unreadable successful response, or invalid returned resource identity | postWrite true, retryable false, writeOutcome uncertain; no submitted event or normal completion; existing same-target block remains |
| Valid returned write result, genuine subsequent refresh failure | postWrite true, retryable false, writeOutcome confirmed; retain the original result and a callback that retries reads only |
| Valid write and refresh complete | Existing returned value and normal completion |
| Refresh canceled or superseded | Never downgrade the known write to uncertainty or report cancellation as failure; preserve current query ownership |

For the Hono adapter, resolve and validate the endpoint before dispatch so malformed local routes remain ordinary pre-dispatch failures. Treat rejected asynchronous write requests and write-response parsing failures conservatively as uncertain. Definite validation/auth/conflict 4xx responses remain ordinary rejections; timeout responses and 5xx responses are uncertain unless this adapter has explicit stronger evidence. Preserve normalized server messages and issues. Read failures do not acquire write metadata. No backend changes or idempotency protocol.

## Exact surface behavior

1. Resource invalidation must expose genuine active-read failures to the binder. Check every affected active read; do not allow one canceled read to hide another genuine failure. No active read means invalidation can succeed by marking cached data stale. Preserve the current rule that display/list/options refresh, while active form drafts are protected.
2. A confirmed-refresh error carries the successful validated result and captured resource/id recovery callback. The callback cannot invoke create, update, delete, custom run, or any feature callback. Capture the runtime before await; do not use a later installed application's runtime.
3. Form keeps existing session/target checks. On a trusted confirmed-refresh failure, store the error, report one warning `Changes saved. Could not refresh the data.`, and emit submitted exactly once with the original TResult. Extend the submitted event with an optional second refresh-error argument so FormView skips its normal success toast for this case. Forward the optional argument through Form and DialogForm. Existing first-argument consumers remain domain-result consumers. Do not emit the ordinary write-error event for this confirmed case. FormView still applies its existing afterSubmit and navigation policy; DialogForm still applies its normal successful-close policy.
4. A Form that stays mounted shows the confirmed wording and a Retry refresh control. Its existing exposed refresh method and action-slot refresh callback use the captured recovery callback for this error. A successful recovery clears only this confirmed refresh error, with current-session/target checks. An uncertain error stays blocked through ordinary refresh, reset, edits, schema changes, and query changes. Do not clear later errors or a new target from an old recovery completion. Keep cancellation from falsely clearing recovery state. Preserve newer edits made while the write was pending.
5. Default ListView delete closes the confirmation on confirmed-write/failed-refresh and reports one saved/refresh warning. It retains the per-identity block until an explicit successful read recovery; stale rows cannot trigger another delete. Add an optional guarded refresh callback to deleteState for slots and show Retry refresh in the default persistent warning. Reuse the existing outcome map and identity encoding. Other identities remain usable. Prevent concurrent duplicate recovery requests. Capture ownership and ignore late completions after rebinding/unmount. Ordinary rejected deletes remain retryable.
6. Suppress ordinary read notifications for this write-owned refresh attempt using Plan 099's internal coordination. Other current reads still notify. Success callbacks, submitted events, warning feedback, and navigation must each run at most once. A retry never repeats them or the write.
7. Unknown/legacy postWrite errors without the new outcome remain conservative uncertainty. This is current contract handling, not a new alias. Keep ResourceResultInvalid conservative; an invalid result cannot fabricate a valid success payload.

## Scope

Production: `packages/loom/src/contracts/results.ts`, `contracts/forms.ts`, `contracts/views.ts`, `adapters/projectAdapters.ts`, `query/client.ts` and the Plan 099 internal feedback owner, `resources/bindResource.ts`, one small internal resource outcome module shared by the binder/session/views if needed, `forms/useFormSession.ts`, `components/core/Form.vue`, `components/core/TableContent.vue` for retained-data error rendering, `components/composites/DialogForm.vue`, `components/views/FormView.vue`, `components/views/ListView.vue`; `apps/web/src/framework/hono/actions.ts`, `apps/web/src/framework/adapters/data/normalize.ts`.

Tests: existing binder, form-session, view, Table, DialogForm, normalizer, and Hono action suites; existing form/view type fixtures if the extended event/slot needs proof. Shared HTTP integration is Plan 102. Documentation: Loom README, resource ARCHITECTURE, this plan and index. Do not modify agent skill files; record any stale skill guidance as a limitation.

Out of scope: application module declarations/pages, API/Sprindle, schema aliases, public completion envelopes, command presentation, new inputs, dependencies, unrelated baseline renderer-type repairs, commits/pushes.

## Commands

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat f507f5e..HEAD -- packages/loom/src apps/web/src/framework` | Read in-series drift; preserve local work |
| Loom focused | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/resources/__tests__/boundResource.spec.ts src/forms/__tests__/useFormSession.spec.ts src/components/views/__tests__/views.spec.ts src/components/composites/__tests__/DialogForm.spec.ts src/components/views/__tests__/resource-cache.spec.ts` | All selected tests pass |
| Web focused | `pnpm --filter @southneuhof/framework-web test:focused -- framework/hono/actions.spec.ts framework/adapters/data/normalize.spec.ts` | All selected tests pass |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | No new diagnostics relative to recorded baseline |
| App lint | `pnpm --filter @southneuhof/framework-web lint:focused -- src/framework/hono/actions.ts src/framework/hono/actions.spec.ts src/framework/adapters/data/normalize.ts src/framework/adapters/data/normalize.spec.ts` | Exit 0; report warnings |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | Exit 0 |
| Unit | `pnpm --filter @southneuhof/loom test` | Exit 0 |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |
| Hygiene | `git diff --check` | Exit 0 |

Node is v26.9.0 and pnpm is 12.1.0 in this session. The prior index records historical consumer diagnostics, but the parent proved that an isolated source snapshot of current HEAD `f507f5e` passes the app compiler with exit 0. See the review record below. Current app type errors are regressions to repair; there is no accepted ten-error baseline for this task. Loom has no lint script. No installation is needed.

## Steps and tests

1. Read root AGENTS, resource architecture, DESIGN, web-ui-surfaces and its query reference, test-audit, and this plan. Record Drift, local status, Loom focused/types and Web focused/types baselines. Verify: capture exact diagnostics and exit codes.
2. Extend existing owners with failing cases for acknowledged valid write followed by a real failed loader, lost response, malformed result, and a definite rejection. Do not mock invalidation to prove HTTP refresh failure. Existing injected invalidation-error coverage can remain as its separate cache-client failure case. Verify: the intended new regression fails before its production fix.
3. Extend metadata and both normalizers. Repair Hono classification and binder refresh observation/recovery. Preserve type inference and result identity checks. Verify: Web focused, binder tests, and Loom types pass.
4. Extend existing Form and delete outcome owners and optional event/slot information. Verify: Loom focused passes for one completion/result, one warning, no second write, read-only retry, uncertain block retention, canceled recovery, and stale-target recovery. Include undefined delete result and create without a form loader.
5. Update user-facing wording and completion ownership docs. Verify: Diagnostics, Architecture, Loom types, App lint, and Web types have the expected results. Do not loosen architecture assertions for an obsolete contract; update only a specific active rule if the implemented outcome contract requires it and report that need before editing its owner.
6. Run Unit and Browser once after the owners are complete. Verify: tests pass, scope matches this list, Hygiene passes, and evidence is recorded. Parent review is required before DONE.

## Done and stop conditions

- [x] The real refresh-error path is observed; a cancellation cannot hide another failed read.
- [x] Known saved writes use confirmed wording and original result; uncertain writes never fabricate completion.
- [x] A normal rejected write can be corrected; uncertain or unresolved confirmed writes cannot repeat through their mounted surface.
- [x] Recovery sends reads only, is guarded, and does not repeat completion, navigation, or feedback.
- [x] Metadata survives the actual app normalizer; optional event/slot data compiles.
- [x] All required gates pass or an identical baseline failure is proved and reported.

Stop for a required server/idempotency contract, public operation return-envelope change, or a new cross-session mutation registry. Report a scope expansion before editing. Stop after two failed bounded corrections of the same gate. An existing consumer type failure is reportable baseline evidence, not permission to weaken types.

## Maintenance

Transport owns evidence about response receipt; resource binding owns identity validity and refresh classification; mounted surfaces own recovery state and feedback. New normalizers must preserve completion metadata. Local blocks do not provide server idempotency across remounts. Keep that limit explicit.

## Parent review round 2 — 2026-10-14

The parent independently reran Loom unit (527 pass), browser (79 pass), Loom/app types, diagnostics, app lint, and architecture. App unit reproduces the recorded baseline failures. Acceptance remains pending one lifecycle correction and a bounded cleanup:

- `ListView.performDelete` checks the active binding before clearing or storing the captured request's outcome. When a request finishes while another resource is active, the original owner/identity can remain pending forever. Settle the captured request's own outcome while suppressing effects on the active different binding. A confirmed success clears its captured pending state; a definite rejection permits deliberate retry; an uncertain or confirmed-refresh failure retains its captured error and appropriate recovery. Never overwrite a newer request/outcome for the same identity. Unmount remains silent.
- Extend the existing rebind test to switch away, settle the old request, and return to its original owner. Assert pending is false after settlement and the correct retry/block policy, with no late toast or dialog close. Use this extension as the primary regression rather than another copied fixture.
- Keep the pre-existing delete-outcome describe block and tests at their original location. Place new cases in that block instead of relocating the old cases to the top of the file. This reduces unrelated diff noise.
- Remove unused fixture rows/runtime overrides in mountBoundDeleteList and the unused queryClient capture in the non-cancellation Form recovery test. FrameworkPlugin already installs the actual runtime.
- FormExposed should inherit the newly shared refresh action directly instead of omitting and immediately redeclaring the identical member.

After this focused correction, rerun the affected owner tests, both type checks, diagnostics/architecture, and the full Loom unit gate. The passed browser/HTTP gates can be reused only if no new code affects their distinct contracts; otherwise rerun them. Record the reason and actual command selection.

### Luna round 2 execution — STOPPED

The stale-owner regression failed before the correction as required. Command: `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom --reporter=dot src/components/views/__tests__/views.spec.ts -t 'settles a stale'`. Exit 1. Both table cases failed because the original outcome stayed pending. Evidence: `plans/loom-feedback-evidence/list-delete-stale-owner-red.log`.

The correction now settles only the captured pending outcome. A success clears it. A definite rejection clears it for a deliberate retry. A normalized post-write error remains on the captured owner. The completion checks the active binding after settlement, so a stale completion cannot toast or close the current dialog. The new owner test covers late success and late rejection. The existing runtime identity test now records the setup error with Vue's error handler and unmounts a mounted app.

The latest affected-owner command was `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom --reporter=dot src/components/views/__tests__/views.spec.ts src/forms/__tests__/useFormSession.spec.ts`. Exit 1: 1 file failed and 1 passed; 3 tests failed and 86 passed out of 89. The three failures were confirmed delete-refresh cases: `keeps a confirmed delete blocked through failed and canceled recovery, then clears it once`, `ignores a late successful delete read after the list is rebound`, and `ignores a late failed delete read after the list unmounts`. Evidence: `plans/loom-feedback-evidence/list-delete-owner-focused.log`.

The full `views.spec.ts` run also failed those three tests: 70 passed, 3 failed out of 73. A temporary diagnostic, removed from source, showed that `useResourceRuntime().queryClient` differed from the mounted host's injected client after the earlier runtime identity setup error. The runtime identity test was changed to capture that error through the app error handler and unmount normally. This final fixture correction has not been tested. The task's two bounded failed correction attempts at this gate have been used, so work stopped here.

The full Loom unit, browser, type, diagnostic, architecture, HTTP, and diff-hygiene gates were not rerun after this correction. The previous green evidence remains in the earlier execution record, but it does not verify the current diff. Plan 102's corrected expected-red baseline remains `plans/loom-feedback-evidence/parent-http-red-baseline.log` (five of seven cases fail on clean `f507f5e`). No test fixture creates write-outcome metadata.

## Execution evidence

First Luna pass stopped before full gates. Parent reran HTTP integration, compiler diagnostics, and app types; all failed. Logs: `plans/loom-feedback-evidence/parent-first-*.log`. A git-archive snapshot of HEAD with links to installed dependencies and the unchanged generated API contract was compiled with `vue-tsc --noEmit --incremental false -p <snapshot>/apps/web/tsconfig.vitest.json`; exit 0. The working source was never restored or changed for this baseline proof. `parent-baseline-web-types.log` is empty because the compiler had no diagnostics.

The reviewed implementation requires these corrections before another gate pass:

1. A failed background read must keep the current query's existing rows visible with an explicit stale-data error. The current TableContent error branch removes all rows, including the delete recovery controls. Change only retained-data error rendering; initial load failure without rows retains its existing full error state. Custom collection slots receive the actual error state. Never display previous-query rows as current data.
2. The three copies of the confirmed-error predicate in Form, useFormSession, and ListView must have one small shared internal owner. Classification and the emitted result must come from binder-produced raw completion metadata, not arbitrary metadata fabricated by a custom normalizer. Preserve the original result and recovery callback when normalizing the message. Add an ordinary raw error with a fabricated confirmed normalizer result as a negative control.
3. Reuse the already exported defaultDataAdapter for shared completion/SchemaIssue normalization in the app adapter; keep only the application-specific errors-map conversion there. Do not maintain new duplicated validators/metadata readers in both adapters. No new public utility API is needed.
4. Mark invalid resource results explicitly uncertain. Do not write a test that requires the outcome to be absent; the specification requires uncertainty without a success result or recovery callback.
5. Form and delete UI retries handle genuine read failures and cancellations without an unhandled rejection. Genuine failed deliberate retries report once and retain the block; cancellation is silent and does not clear it. Exposed/action-slot retry and native controls must use the same guard. Prevent concurrent recovery; one old-target recovery cannot suppress recovery for a later target.
6. Remove ListView's new activeDeleteRecoveries history map and unmount-reset loop. One mounted flag plus existing outcome ownership is sufficient. Both successful and failed late delete/recovery completions must be silent after unmount or rebind, and cannot close a newer dialog.
7. Add the missing primary Form/session/delete tests: failed and canceled recovery, concurrent retry, same-target uncertainty retention, a new target during old recovery, original result once, wrapper event forwarding, and preserved newer draft edits. Extend the existing owners; do not repeat their full old matrices in HTTP tests.
8. Repair all new app test type errors without type suppression. Hono action test inputs must include their actual required nested value. The integration update callback needs a real typed form output, not an inferred never parameter. Fixture mount annotations can follow existing generic Vue mount conventions but must not bypass resource/schema checks.

Final implementation gates passed, except the full app unit suite. That suite has the same failures as current HEAD `f507f5e`, proved in `plans/loom-feedback-evidence/app-unit-baseline.log`. Parent review remains pending.

### Final execution record — 2026-10-14

Status is **IMPLEMENTED — parent review pending**. The parent owns approval.

The binder now attaches trusted `confirmed` metadata only after result validation and a genuine read failure. It retains the original result, including an own `undefined` result for delete, and a reads-only recovery callback. Invalid resource results are `uncertain`. The Hono adapter distinguishes local pre-dispatch failures, definite HTTP rejections, and uncertain transport or response parsing failures. The default app normalizer uses the exported `defaultDataAdapter` for shared metadata and issue handling. One internal predicate owns confirmed-error classification. A custom error normalizer cannot turn an ordinary failure into confirmed success.

Form and delete surfaces retain their existing target and identity guards. They emit one completion and one warning, block blind repeat writes, and catch read recovery failures once. Canceled recovery does not clear a block. Old recovery cannot clear a newer target or report after a rebind or unmount. Current Table rows remain visible with a stale-data warning after a same-query refresh failure. Collection slots receive the actual error. A changed query does not show rows from the prior query.

| Gate | Command | Result |
|---|---|---|
| Focused Loom owners | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom --reporter=dot src/query/__tests__/loader.spec.ts src/components/inputs/__tests__/option-source.spec.ts src/resources/__tests__/boundResource.spec.ts src/forms/__tests__/useFormSession.spec.ts src/components/views/__tests__/views.spec.ts src/components/core/__tests__/table-collection.spec.ts src/components/composites/__tests__/DialogForm.spec.ts` | PASS, 7 files, 165 tests |
| Focused app transport | `pnpm --filter @southneuhof/framework-web test:focused -- framework/hono/resource-completion.spec.ts framework/hono/actions.spec.ts framework/adapters/data/normalize.spec.ts` | PASS, 3 files, 27 tests |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | PASS, exit 0 |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | PASS, exit 0; route contract and generation also pass |
| App lint and format | `pnpm --filter @southneuhof/framework-web lint:focused -- src/framework/hono/actions.ts src/framework/hono/actions.spec.ts src/framework/adapters/data/normalize.ts src/framework/adapters/data/normalize.spec.ts src/framework/hono/resource-completion.spec.ts` | PASS, exit 0; no warnings |
| Loom unit | `pnpm --filter @southneuhof/loom test` | PASS, 64 files, 527 tests |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | PASS, 17 files, 79 tests |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | PASS, 35 Loom, 14 TypeScript, and 8 Vue cases |
| Architecture | `pnpm test:surface-architecture` | PASS, 34 checks |
| Hygiene | `git diff --check` | PASS, exit 0 |

The full app unit command `pnpm --filter @southneuhof/framework-web test` exits 1: 47 files, 42 passed and 5 failed; 230 tests, 223 passed and 7 failed. The failures are the same seven role-permission and user-role-assignment tests plus three `localStorage.getItem` import failures in the baseline snapshot. The current HEAD snapshot type-check is clean: `parent-baseline-web-types.log` is empty. Do not use the historical ten-renderer-diagnostic report as this baseline. Current app types exit 0.

The first review expected-red evidence is in `parent-first-http.log`, `parent-first-web-types.log`, and `parent-first-diagnostics.log` under `plans/loom-feedback-evidence/`. It recorded five of seven new HTTP integration cases failing, one unhandled read rejection, resource columns becoming invalid because compact columns widened missing `sortable` to `boolean`, and five diagnostic location mismatches. The real Table defect hid retained rows after the delete refresh failed. These defects are repaired. The corrected suite switches failed HTTP reads to success before recovery and edits `Current` to `Changed` before PATCH.

Test-audit authoring answers:

| Cases | Observable behavior and credible regression | Why current coverage was not enough | Production seam |
|---|---|---|---|
| Hono cases `marks rejected write requests as uncertain after dispatch`, the `it.each` unreadable-response and status cases, `keeps definite write rejections ordinary and preserves server issues`, and `does not add write metadata to failed reads` | The public action result and normalized error fields prove what the transport knew before and after dispatch. A lost response must stay uncertain; a definite 4xx must stay editable. | Unit binder tests cannot distinguish a real Hono request rejection, response parser failure, and definite HTTP status. | None. The tests use Hono's typed client and a controlled `fetch` response. |
| Normalizer cases `preserves confirmed write results, refresh callbacks, and issues` and `preserves a confirmed undefined result and its read recovery callback`; binder case `keeps an undefined delete result and offers reads-only recovery after refresh failure` | The first callback argument and own `undefined` metadata survive both adapters; retry invokes only reads. | Existing normalizer tests cover message cleanup, while the binder test must prove real identity and invalidation ownership. | None. Existing `defaultDataAdapter`, resource binder, and adapters run directly. |
| Form cases `forwards one confirmed result and safely handles failed and shared read recovery`, `keeps a confirmed Form recovery blocked when its read is canceled`, `starts recovery for a new target while an old target read is pending`, and `does not accept confirmed completion metadata from a custom normalizer` | Result/event count, warning count, target state, and submit count show that errors cannot fabricate completion or clear a newer block. | Binder coverage cannot prove mounted session ownership, newer draft retention, or custom normalizer behavior. | None. The Form and its resource/query owners are mounted through existing test helpers. |
| ListView cases `keeps a confirmed delete blocked through failed and canceled recovery, then clears it once`, `ignores a late successful delete after its list is rebound`, `ignores a late rejected delete after its ListView unmounts`, `ignores a late successful delete read after the list is rebound`, `ignores a late failed delete read after the list unmounts`, `retains independent post-write outcomes across query and row replacement`, `keeps a normalized pre-write failure retryable`, `blocks a duplicate pending delete and ignores its completion after resource rebind`, and `forwards one confirmed result and safely handles failed and shared read recovery` | Rows, dialog state, per-identity retry state, delete counts, and warnings expose independent identities, duplicate attempts, and late completion behavior. | Form coverage has no delete identity map or confirmation lifetime. Table coverage does not own delete operations. | None. Existing ListView, resource bindings, and query runtime are mounted. |
| Table cases `keeps current rows and passes the failed refresh state to a collection slot` and `does not show rows from the prior query while the next query is loading`; DialogForm case `forwards a confirmed write result and refresh error once before closing` | DOM, slot props, and emitted event data protect stale-row recovery, query isolation, and the successful close path. | Neither binder nor ListView tests prove TableContent slot output or DialogForm event forwarding. | None. Public components and slots run in their existing test harnesses. |

Changed production files: `packages/loom/src/contracts/results.ts`, `contracts/forms.ts`, `contracts/views.ts`, `adapters/projectAdapters.ts`, `query/client.ts`, `query/feedback.ts`, `resources/bindResource.ts`, `resources/postWriteOutcome.ts`, `forms/useFormSession.ts`, `components/core/Form.vue`, `components/core/TableContent.vue`, `components/composites/DialogForm.vue`, `components/views/FormView.vue`, `components/views/ListView.vue`, `apps/web/src/framework/hono/actions.ts`, and `apps/web/src/framework/adapters/data/normalize.ts`. Test files are listed in the execution commands and parent review diff. No application modules, backend files, dependencies, or API contracts changed.


## Parent reconciliation — test app lifecycle, 2026-10-14

The parent reran the current owner gate: 4 failures, 85 passes. Evidence:
`plans/loom-feedback-evidence/parent-round2-owners.log`. The two-round review
limit is reached; the preceding execution is BLOCKED, not accepted.

The approach now changes at the test fixture only. The existing reserved
filter-key test lets a Vue setup error escape `app.mount`, before the new
identity test. The identity test's error handler sees six errors, not one.
Three bound delete recovery tests then use a resource runtime different from
their injected query client. The previous manual runtime registration hid
this fixture contamination. Do not restore it or change production runtime.

Reconciled execution: make both expected setup-error tests use fully mounted
apps with Vue error handlers and normal cleanup. Keep their actual contract
assertions; do not silence or weaken them. Put cleanup in a reliable path.
First prove the complete views file plus form-session file pass in their
normal order without manual resource runtime registration. If they fail,
stop and record the exact remaining diagnosis. Do not extend this into a
production runtime redesign or a shared test-harness redesign.

Once that fixture gate passes, rerun Loom unit, browser, both compiler gates,
contract diagnostics, surface architecture, focused Hono HTTP and normalizer
cases, app focused lint, and diff hygiene. Existing full app baseline failure
proof may be reused because this correction touches only Loom view tests.
Record new evidence separately from the earlier green run. Parent review
owns final acceptance of this reconciled execution.

### Reconciled execution record — 2026-10-14

Status is **IMPLEMENTED — parent review pending**. The parent owns approval.

Both expected setup-error tests now mount a real Vue app, record errors with
Vue's error handler, assert the expected validation message, and unmount in a
`finally` block. Cleanup also resets the installed test resource runtime.
The filter-key test no longer lets a setup exception escape the mount helper.
The filter-key test requires the exact validation in Vue's `setup function`
phase. The identity test requires the exact validation in the observed
`watcher getter` phase and ignores later incidental render errors. No manual
runtime registration or shared harness change was added. The three bound
delete recovery tests now use the query client from their own mounted app.

| Gate | Command | Result |
|---|---|---|
| Owner gate | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom --reporter=dot src/components/views/__tests__/views.spec.ts src/forms/__tests__/useFormSession.spec.ts` | PASS, 2 files, 89 tests |
| Loom unit | `pnpm --filter @southneuhof/loom test` | PASS, 64 files, 529 tests |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | PASS, 17 files, 79 tests |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | PASS, exit 0 |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | PASS, exit 0 |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | PASS, 35 Loom, 14 TypeScript, and 8 Vue cases |
| Architecture | `pnpm test:surface-architecture` | PASS, 34 checks |
| HTTP and normalizer | `pnpm --filter @southneuhof/framework-web test:focused -- framework/hono/resource-completion.spec.ts framework/hono/actions.spec.ts framework/adapters/data/normalize.spec.ts` | PASS, 3 files, 27 tests |
| App lint | `pnpm --filter @southneuhof/framework-web lint:focused -- src/framework/hono/actions.ts src/framework/hono/actions.spec.ts src/framework/adapters/data/normalize.ts src/framework/adapters/data/normalize.spec.ts src/framework/hono/resource-completion.spec.ts` | PASS, exit 0; no warnings |
| Hygiene | `git diff --check` | PASS, exit 0 |

Fresh logs are under `plans/loom-feedback-evidence/round3-*.log`. The
pre-fix stale-owner cases failed because the captured outcome stayed pending:
`list-delete-stale-owner-red.log`. The parent corrected HTTP baseline remains
`parent-http-red-baseline.log` and has five intended failures of seven. The
parent owner log `parent-round2-owners.log` records the fixture contamination
that this correction removed. The app unit suite was not rerun because this
round changed only Loom test fixtures. The latest full app result is recorded
in `parent-final-app-unit.log`: 47 files, 42 passed and 5 failed; 230 tests,
223 passed and 7 failed. The clean HEAD baseline in `app-unit-baseline.log`
reproduces the same 7 route test failures and 3 suite import failures in the
affected files. This correction adds no app source changes.

Test-audit review of the changed setup-error owners:

| Observable behavior and credible regression | Why existing coverage was not enough | Production seam |
|---|---|---|
| The mounted app reports the reserved-filter or missing-identity validation. An uncaught setup error can leave the app runtime installed and make later bound actions use the wrong client. | The old throw-based `mountCore` and `mountControlledListView` paths did not route setup errors through Vue's error handler or guarantee cleanup after failed mounts. | None. The tests mount ListView through the real FrameworkPlugin and router. |

### Final fixture cleanup — 2026-10-14

The parent found formatting churn in untouched portions of `views.spec.ts`.
Those sections now match git HEAD. The diff keeps the two mounted validation
fixtures, their exact slot typing fix, the bound delete helper and tests, and
the stale-owner regression. It adds no production changes, comments, runtime
overrides, casts, or suppressions. The observed Vue error phases are recorded
by the assertions: the reserved filter key fails in `setup function`; the
missing delete identity fails in `watcher getter`. Each test checks the exact
validation text in that phase and cleans up the mounted app in `finally`.

| Gate | Command | Result |
|---|---|---|
| Validation fixtures | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom --reporter=dot src/components/views/__tests__/views.spec.ts -t 'rejects page as a filter-owned query key\|requires a record identity at runtime when delete is configured'` | PASS, 1 file, 2 tests; 71 skipped |
| Views and Form session owners | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom --reporter=dot src/components/views/__tests__/views.spec.ts src/forms/__tests__/useFormSession.spec.ts` | PASS, 2 files, 89 tests |
| Loom unit | `pnpm --filter @southneuhof/loom test` | PASS, 64 files, 529 tests |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | PASS, exit 0 |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | PASS, exit 0 |
| Hygiene | `git diff --check` | PASS, exit 0 |

Fresh logs are `round4-error-stages.log`, `round4-owner-tests.log`,
`round4-loom-unit.log`, `round4-loom-types.log`, `round4-web-types.log`, and
`round4-diffcheck.log`. Browser, HTTP, diagnostics, architecture, and app lint
evidence remains in `parent-accepted-*.log`; this correction changed only Loom
view test fixtures, so those gates were not rerun. The full app unit baseline
remains `parent-final-app-unit.log` and `app-unit-baseline.log`.
