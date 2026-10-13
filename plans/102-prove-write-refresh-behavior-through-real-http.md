# Plan 102: Exercise read and write completion through real mounted HTTP paths

## Status

- Status: DONE — parent APPROVE, 2026-10-14. Priority: P1. Effort: M. Risk: LOW. Confidence: HIGH.
- Category: tests. Planned at: `f507f5e`, 2026-10-13.
- Depends on: Plans 099 and 100 for final green behavior. Test setup and expected-red proof may be prepared before their production repairs by the same serial implementation owner.
- Implementation and test execution are authorized with GPT-6 Luna at max reasoning. No commits, pushes, dependencies, external HTTP services, API/database setup, or E2E environment is authorized.


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

Real query-client tests and HTTP transport tests exist, but they are separate. Replacing invalidateQueries with a rejected mock proves a cache-client exception, not a real failed HTTP refresh. Join existing test patterns to prove the framework's actual completion, cancellation, and feedback behavior.

## Current state

- `packages/loom/src/components/core/__tests__/harness.ts:29` mounts real components, router, FrameworkPlugin, and query client.
- `components/views/__tests__/resource-cache.spec.ts:32` mounts real resources and views and tests active/inactive invalidation with authored loaders.
- `apps/web/src/framework/hono/actions.spec.ts:50` uses a real Hono client and Request/Response boundary with a controlled fetch implementation.
- `resources/__tests__/boundResource.spec.ts:605` mocks invalidation rejection for its cache-client failure case. Retain that case's distinct meaning; do not use it as HTTP proof.
- The Users resource plus ListView/DetailView/FormView routes are already compiled examples. Module scaffolding was deliberately removed by Plan 073. Do not create another scaffold or reference module.

HTTP exemplar from `actions.spec.ts:50`:

```ts
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => app.fetch(new Request(String(input), init)))
const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
const actions = createHonoResourceActions(rpc.rows, { querySchema })
```

Use real public framework components and operations. Controlled fetch/HTTP responses and a toast-output spy are permitted. Never mock useLoader, resource binding, Form session, query invalidation, cancellation, or the query client.

## Exact proof

Create one focused app integration suite at `apps/web/src/framework/hono/resource-completion.spec.ts`. Reuse existing real-plugin/router mount patterns; keep small shared setup local to this suite unless an existing harness is directly reusable without cross-package test-private imports. Do not create or export a production seam for testing.

| Case | Required observable proof |
|---|---|
| Valid create/update POST/PATCH result, active collection GET fails | Original write result reaches submitted once; one saved/refresh warning; no ordinary write-error event; retained mounted guard where the view stays open |
| User selects Retry refresh | GET only; one write total; no repeated submitted/navigation; warning state clears only after actual successful read |
| Confirmed DELETE with stale row still visible | Default confirmation closes; saved/refresh warning; second delete blocked for that identity; another identity still usable; recovery sends reads only |
| Two observers share failed GET | One terminal failure notification and both expose error state |
| Pending query A is replaced by B, then A rejects | A signal is aborted; B remains current; no stale error or toast; no unhandled rejection |
| Definite rejected write | No submitted event; draft retained; a corrected deliberate submit works |
| Write response lost after dispatch | Uncertain guidance; native/exposed/slot repeat attempts send no second write; an ordinary refresh does not unlock |

Do not replay every generic permission/cancellation/session test here. Existing owners already cover permission visibility and guards. Add an HTTP-level permission-denial integration only if a distinct integration risk is found and recorded through the test-audit authoring gate.

Use stable deferred requests and explicit conditions. Do not use fixed-duration sleeps or a mock which itself implements the outcome being asserted. The response controller may return selected HTTP failures; it must not set Loom state, generate Loom completion metadata, or call completion handlers. Actual binder/transport must produce those outcomes.

## Scope

Allowed: the new app test above; an existing app test-support file only if shared by real current tests; `packages/loom/src/components/core/__tests__/harness.ts` only if a small test setup option is necessary and used; this plan and index. Tests must use current production APIs from Plans 099/100. Any production defect found must be repaired under that owning plan's allowed files and reported as such.

No production testing exports, dependency additions, new scaffold/reference module, API routes, app business modules, global harness framework, browser configuration changes, or E2E server.

## Commands

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat f507f5e..HEAD -- apps/web/src/framework/hono packages/loom/src/components/core/__tests__/harness.ts` | Reconcile series changes and local work |
| Integration | `pnpm --filter @southneuhof/framework-web test:focused -- framework/hono/resource-completion.spec.ts framework/hono/actions.spec.ts framework/adapters/data/normalize.spec.ts` | All selected tests pass with real owners |
| App lint | `pnpm --filter @southneuhof/framework-web lint:focused -- src/framework/hono/resource-completion.spec.ts` | Exit 0; report warnings |
| App unit | `pnpm --filter @southneuhof/framework-web test` | Exit 0 or exact separately proved baseline failure |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | No new diagnostics relative to baseline |
| Loom unit | `pnpm --filter @southneuhof/loom test` | Exit 0 |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0 |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |
| Hygiene | `git diff --check` | Exit 0 |

## Steps and test plan

1. Read test-audit and answer its four authoring questions for each new case in the execution record: behavior, credible regression, missing stronger existing proof, and no test-only production seam. Run Drift and existing HTTP/cache tests as baseline. Verify: record selected test counts and results.
2. Build the small real HTTP mount fixture and the primary failed-refresh journey before the production repair if possible. Verify: Integration fails at the missing confirmed result/warning/recovery behavior, not at fixture setup. Record intended failure. If Plans 099/100 are already repaired, prove the regression using an isolated baseline or a bounded temporary pre-fix variant with exact restoration; never modify source while tests run or discard unrelated edits.
3. Add the distinct HTTP/cancellation journeys from the table. Let the same serial owner finish Plans 099/100. Verify: Integration passes; request methods/counts show one write and read-only recovery.
4. Review the tests for implementation coupling and duplicate owner proof. Verify: App lint, App types, Diagnostics, and Architecture pass or have exactly recorded baseline errors.
5. Run the full Loom unit/browser and app unit gates after all series changes. Record counts and warnings, scope review, and unavailable external test-audit tools. Verify: Hygiene passes and all changed tests protect observable behavior. Parent owns final approval.

## Done and stop conditions

- [x] Real views, resources, transport, query client, and invalidation run in the same tests.
- [x] POST/PATCH/DELETE success followed by failed GET is distinguished from rejected and uncertain writes.
- [x] Recovery never repeats a write or completion hook.
- [x] Shared/obsolete read feedback is proved at the HTTP boundary.
- [x] Tests fail for the intended pre-fix behavior and pass after the repair.
- [x] No replacement harness, scaffold, production test seam, or copied generic test matrix.

Stop if fixture setup needs a real server, database, dependency installation, or production-only testing hook. Report production defects to Plans 099/100 rather than working around them in a mock. Stop after two failed bounded corrections at the same gate; refine the fixture or report the actual defect.

## Maintenance

Keep query-runtime and HTTP-level proof together only where the integration risk requires it. Generic access and lifecycle contracts retain their existing primary owners. A test harness does not prove backend persistence or server idempotency; those remain outside this local framework contract.

## Parent expected-red proof — 2026-10-14

The parent copied the corrected final HTTP regression file into an isolated git-archive source snapshot of `f507f5e` and ran the real app Vitest configuration with installed dependency links. No current production source was changed. The suite failed five of seven cases for the intended reasons: missing confirmed create/update refresh guidance, missing delete refresh warning, missing shared-read failure notification, and lost write response without an uncertainty block. Cancellation and definite rejection controls passed. Log: `plans/loom-feedback-evidence/parent-http-red-baseline.log`. This is the primary pre-fix evidence; the first-review fixture failures remain review history only.

### Parent review round 2 status

The required seven-case HTTP suite was not rerun after the ListView stale-owner correction. Plan 100 stopped at its bounded views owner gate, so this plan remains stopped until the changed ListView path and the real HTTP suite pass together.

## Execution evidence

First Luna pass STOPPED after two fixture correction attempts. Parent reproduced 5 failures among 7 HTTP integration tests, plus one unhandled read rejection. The bounded retry limit served its purpose; the brief is now reconciled with concrete source findings rather than another blind fixture retry.

Revision requirements:

- Recovery responses must actually switch from failed GET to successful GET before Retry. Do not simply remove the state assertion to make a permanently failing response look recovered.
- The update journey must edit the loaded Current name to a distinct value before PATCH, or expect the actual submitted Current value. Prefer a distinct edit so it protects submitted values as well as result forwarding.
- Waiting a larger arbitrary number of flush loops is not the solution. Wait for concrete loaded data, completion, dialog, warning, and recovery-state conditions. One shared small fixture may flush Vue between operations, but assertions must await observable async completion.
- The delete failure is a production defect, not just fixture timing: TableContent hides stale rows on error. Repair that owner under revised Plan 100, then keep the real default delete/recovery journey.
- Use `resource.completions`, the fixture's actual completion record. Ensure every mount/query client is disposed even when an assertion fails, so failed cases cannot affect later tests. Track mounts in test cleanup or use try/finally.
- Fixture routes are controlled HTTP responses only. They must never manufacture write metadata, call submitted handlers, or simulate framework guards. Do not add fixed-duration sleeps, `any`, suppression directives, or broad casts.

After repairs, run all gates and record exact results rather than leaving the plan status at TODO without evidence. Mark IMPLEMENTED — parent review pending only when its required checks pass.

### Final execution record — 2026-10-14

Status is **IMPLEMENTED — parent review pending**. The parent owns approval.

The new HTTP suite crosses real `FormView` and `ListView` components, resource binding, Hono actions, the real QueryClient, the app normalizer, and controlled HTTP responses. Its seven cases cover saved create and update followed by failed GET, saved delete followed by failed GET, shared failed GET, a late failure after query identity changes, a definite rejection followed by a corrected write, and a lost write response. Recovery first changes the route response to success. It checks the observed result and warning, not a manufactured Loom outcome. The update edits `Current` to `Changed` before PATCH. Each mount is tracked for cleanup in `afterEach`.

| Gate | Command | Result |
|---|---|---|
| HTTP integration | `pnpm --filter @southneuhof/framework-web test:focused -- framework/hono/resource-completion.spec.ts framework/hono/actions.spec.ts framework/adapters/data/normalize.spec.ts` | PASS, 3 files, 27 tests |
| App lint and format | `pnpm --filter @southneuhof/framework-web lint:focused -- src/framework/hono/actions.ts src/framework/hono/actions.spec.ts src/framework/adapters/data/normalize.ts src/framework/adapters/data/normalize.spec.ts src/framework/hono/resource-completion.spec.ts` | PASS, exit 0; no warnings |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | PASS, exit 0 |
| App unit | `pnpm --filter @southneuhof/framework-web test` | FAIL, 47 files (42 passed, 5 failed); 230 tests (223 passed, 7 failed). The same seven route tests and three `localStorage.getItem` import failures reproduce on HEAD `f507f5e` in `plans/loom-feedback-evidence/app-unit-baseline.log`. |
| Loom unit | `pnpm --filter @southneuhof/loom test` | PASS, 64 files, 527 tests |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | PASS, 17 files, 79 tests |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | PASS, 35 Loom, 14 TypeScript, and 8 Vue cases |
| Architecture | `pnpm test:surface-architecture` | PASS, 34 checks |
| Hygiene | `git diff --check` | PASS, exit 0 |

Expected-red evidence: `plans/loom-feedback-evidence/parent-first-http.log` records five failures among the seven new HTTP cases and one unhandled read rejection before the corrections. It exposed the retained-delete-row failure and read recovery reporting gap. It also showed fixture defects: the update expectation did not match the submitted `Current` value, the test expected the wrong completion property, and recovery responses remained failures. These fixture issues are corrected; the test now waits for loaded data, completion, dialog, warning, and recovered state. No fixed sleep or metadata-producing mock remains. `parent-first-web-types.log` records the integration typing failures; current app types pass. The app-unit comparison log includes the same three import failures and the same seven route failures on a pristine HEAD snapshot.

The browser run passed with existing console warnings for NumberInput `placeholder` and `prefix`, a missing DialogContent description, route guards mounted outside `router-view`, and TinyMCE evaluation mode. Node also printed the existing `localStorage` experimental warning. The app Vitest command printed its existing esbuild/oxc configuration and removed `test.poolOptions` notices.

Test-audit authoring answers for the seven integration cases:

| Case | Observable behavior and credible regression | Why existing coverage was not enough | Production seam |
|---|---|---|---|
| Saved create, then failed list GET and read recovery | The first result, completion, warning, read-only retry, and single POST are observable. A binder-only fake invalidation would miss transport parsing and QueryClient behavior. | Existing binder tests stop before Hono and HTTP. | None. Real FormView, resource binding, Hono, QueryClient, and controlled fetch run together. |
| Saved update after editing `Current` to `Changed` | The PATCH body, submitted result, completion, warning, and one-write recovery protect current draft values. | Existing Form tests do not prove the real app adapter and HTTP body path. | None. The test uses the real route client and mounted FormView. |
| Confirmed delete with failed list GET | Dialog closure, retained stale row, identity block, another identity's delete, and read-only recovery are visible. | Existing ListView and binder cases do not combine a real DELETE with an HTTP GET failure. | None. Default ListView controls and Hono actions run directly. |
| Two views share a failed HTTP read | Both views expose the error while one notification is sent for one GET. | Query tests do not cross the Hono response adapter. | None. Two real ListViews share the mounted query client. |
| Late GET failure after query identity changes | The first signal is aborted, the new view retains its data, and the old failure does not toast. | Unit lifecycle tests cannot prove the old Hono response is ignored after a mounted view changes. | None. A deferred real fetch response controls arrival order. |
| Definite rejected write followed by corrected submit | Issues remain editable; one failed POST is followed by one deliberate corrected POST and one completion. | Hono status tests do not prove mounted draft recovery or the form's write guard. | None. Actual FormView and Hono transport handle both requests. |
| Lost write response | One dispatched POST stays blocked through exposed and slot submit paths and ordinary refresh. | Transport unit tests do not prove mounted surface protection. | None. Controlled fetch throws after dispatch; Loom classifies the result. |

No new server, dependency, route, database, application business module, or production test seam was added. The test-audit tools `$openclaw-testing`, `$crabbox`, `$autoreview`, and `scripts/check-changed.mjs` are unavailable in this workspace. The four authoring questions above were recorded and the repository's requested focused and full gates were run.


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

The clean views/Form session owner gate now passes without a manual resource
runtime override. The real HTTP integration suite passes after that gate and
the ListView stale-owner correction. It runs mounted FormView/ListView,
resource binding, Hono actions, the app normalizer, and the real query client
with controlled HTTP responses.

| Gate | Command | Result |
|---|---|---|
| Views and Form session owners | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom --reporter=dot src/components/views/__tests__/views.spec.ts src/forms/__tests__/useFormSession.spec.ts` | PASS, 2 files, 89 tests |
| HTTP and normalizer | `pnpm --filter @southneuhof/framework-web test:focused -- framework/hono/resource-completion.spec.ts framework/hono/actions.spec.ts framework/adapters/data/normalize.spec.ts` | PASS, 3 files, 27 tests |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | PASS, exit 0 |
| App lint and format | `pnpm --filter @southneuhof/framework-web lint:focused -- src/framework/hono/actions.ts src/framework/hono/actions.spec.ts src/framework/adapters/data/normalize.ts src/framework/adapters/data/normalize.spec.ts src/framework/hono/resource-completion.spec.ts` | PASS, exit 0; no warnings |
| Loom unit | `pnpm --filter @southneuhof/loom test` | PASS, 64 files, 529 tests |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | PASS, 17 files, 79 tests |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | PASS, exit 0 |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | PASS, 35 Loom, 14 TypeScript, and 8 Vue cases |
| Architecture | `pnpm test:surface-architecture` | PASS, 34 checks |
| Hygiene | `git diff --check` | PASS, exit 0 |

Fresh results are in `plans/loom-feedback-evidence/round3-*.log`. The primary
pre-fix HTTP proof is `parent-http-red-baseline.log`: five of seven cases fail
for the intended confirmed-write and shared-read behaviors; cancellation and
definite rejection controls pass. The old setup-error owner failure and the
repaired result are recorded in `parent-round2-owners.log` and
`round3-owner-gate.log`. The full app unit baseline proof remains
`app-unit-baseline.log`; it was reused because this final correction changed
only Loom test fixtures and plan evidence. The latest full app result is
`parent-final-app-unit.log`: 47 files (42 passed, 5 failed), 230 tests (223
passed, 7 failed). The clean HEAD baseline reproduces the same 7 route test
failures and 3 suite import failures in the affected files.

### Final fixture cleanup — 2026-10-14

The parent review found unrelated formatting churn in the changed view test
file. The untouched sections now match git HEAD. Both expected validation
fixtures use a real mounted app and a Vue error handler: the reserved filter
key is checked in `setup function`, and the missing delete identity is checked
in the observed `watcher getter` phase. Each test matches the exact validation
message and cleans up in `finally`. The original delete-outcome tests remain
at their original location. No production file changed in this correction.

The fixtures pass 2 tests (71 skipped); the views/Form session owner gate
passes 89 tests; the full Loom suite passes 529 tests in 64 files. Loom and
app type checks both exit 0. Fresh logs are `round4-error-stages.log`,
`round4-owner-tests.log`, `round4-loom-unit.log`, `round4-loom-types.log`,
`round4-web-types.log`, and `round4-diffcheck.log`. The browser, HTTP,
diagnostics, architecture, and lint gates remain covered by the parent's
`parent-accepted-*.log` files because this correction changed only the Loom
view test fixtures. The expected-red proof remains
`parent-http-red-baseline.log`, with five intended failures of seven.
