# Plan 099: Report read failures once through the existing query runtime

## Status

- Status: DONE — parent APPROVE, 2026-10-14. Priority: P1. Effort: M. Risk: MED. Confidence: HIGH.
- Category: correctness. Planned at: `f507f5e`, 2026-10-13.
- Depends on: none. Coordinate with Plan 100 for write-refresh feedback.
- The user authorized these plans and their implementation by GPT-6 Luna at max reasoning. No commit, push, package promotion, install, server operation, or external write is authorized.


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

Consumers can currently put notifications inside loader callbacks. Those notifications run before the query runtime can discard cancellation or obsolete work. Two consumers of one request can also report the same failure twice. Keep read state in the existing query runtime and give that runtime one feedback owner.

## Current state

- `packages/loom/src/query/loader.ts:24` already exposes `enabled`. Do not rename it or add `loadWhen` or `loadingEnabled`.
- `loader.ts:54` passes the query-client signal into the authored loader. It normalizes query errors and exposes refresh. Preserve the public load context and returned data contract.
- `packages/loom/src/query/client.ts:19` constructs one QueryClient per application. `adapters/plugin.ts` can also receive an existing QueryClient.
- `components/inputs/useOptionSource.ts:24` uses useLoader. Input disabled controls interaction and does not stop this read.
- `components/composites/form-inputs/LookupInput.vue:178` has its own cancellation and generation checks. Item 4 was rejected; do not redesign this input or change its selection behavior.
- Existing tests in `query/__tests__/loader.spec.ts` cover shared keys, cancellation, normalization, and real invalidation. Extend this owner.

Current excerpt from `loader.ts:54`:

```ts
const query = useQuery<TResult, unknown>({
  queryKey: computed(() => toValue(options.key) as unknown[]),
  enabled,
  queryFn: async ({ signal }) => {
    const load = unref(options.load)
    if (!load) throw new Error('[loom] No loader supplied.')
    const context = { ...toValue(options.context), signal } as TContext
    const result = await load(context)
    return (result ?? missingResult) as TResult
  },
})
```

Definitions remain configuration. Mounted consumers own state. The resource key owns invalidation; namespace identifies a query instance. A data/load alternative and a genuine undefined record must retain their existing meanings. Existing query-client cancellation is the owner; do not build a second request scheduler.

## Exact target

1. Give each installed query client one read feedback owner. It must support both framework-created and supplied clients. Clean up application subscriptions on unmount. Do not add a public feedback manager, error bus, query-key API, or notification configuration unless a current owner requires it.
2. Report a genuine terminal failure once per fetch attempt, after configured retries finish. Use the installed data adapter for the message and the existing toast mechanism. Two current observers of the same key produce one notification. Mounting an observer on a cached error must not replay the old notification. A new deliberate failed retry may report once again.
3. A lifecycle cancellation, abandoned key, obsolete identity, or unmounted last consumer produces no failure notification. A late result must not change the current consumer's data or error. A shared query with another current consumer is still relevant to that consumer.
4. Preserve inline errors and retry controls. Preserve page-readiness registration. An empty result is not a failure. Do not suppress a genuine active failure merely because the input is disabled.
5. Externally supplied data and `enabled: false` do not dispatch reads. Interaction disabled remains separate. Do not add a new public input enable prop in this plan.
6. Refresh must reject on a genuine failure so its initiating owner can report recovery correctly. Canceled or superseded refreshes are silent and must not masquerade as successful reconciliation of an uncertain write.
7. Provide only the small internal coordination needed by Plan 100 to suppress ordinary read toasts for reads owned by a write-refresh attempt. That attempt reports one combined saved/refresh-failed warning at its initiating surface. Unrelated reads must still report. No global mutation history or cross-application notification state.
8. Document that custom inputs use useLoader when they own a custom data set. Existing independent Lookup/location/file-manager loaders are outside this change. Do not claim that this change covers them.

## Scope

Allowed production owners: `packages/loom/src/query/loader.ts`, `query/client.ts`, `adapters/plugin.ts`, and `components/inputs/useOptionSource.ts` for its existing fire-and-forget refresh owner. One small internal query feedback module under `query/` is allowed if these actual owners share it. Update `query/index.ts` only if a changed existing export requires it; internal coordination must not be exported there.

Allowed tests: `query/__tests__/loader.spec.ts`, `query/__tests__/harness.ts`; a plugin lifecycle case in the existing adapter test owner if needed. Allowed documentation: `packages/loom/README.md`, `docs/resource_system_overhaul/ARCHITECTURE.md`, this plan, and the new index section.

Out of scope: new selection components, LookupInput mechanics, public enabled aliases, command presentation, application modules, API/Sprindle, dependencies, and unrelated formatting.

## Commands

Run from the repository root. Loom has no lint script; do not invent one.

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat f507f5e..HEAD -- packages/loom/src/query packages/loom/src/adapters` | Reconcile committed drift and separately inspect local edits |
| Focused | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/query/__tests__/loader.spec.ts` | All selected tests pass after repair |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Unit | `pnpm --filter @southneuhof/loom test` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |
| Hygiene | `git diff --check` | Exit 0 |

## Steps and test plan

1. Read this plan, root AGENTS, the resource architecture, and test-audit. Record git status. Run Drift, Focused, and Types before edits; preserve unrelated work. Verify: record exact commands, counts, exit status, and any baseline failures.
2. Extend the existing mounted-query fixture with two observers and a rejected loader. Assert one notification after retries, normalized message, and retryability of the read. Use a real query client; a toast spy is allowed because it observes the output. Verify: Focused fails on the intended notification contract before production edits; record the failure.
3. Implement the one-client feedback owner and lifecycle integration. Add controlled cancellation/key replacement, a late rejection, observer disposal, cached-error remount, and a new retry to the same primary fixture. Assert user-visible data/error and notifications rather than subscription call shapes. Verify: Focused and Types pass.
4. Check disabled interaction versus enabled reads through the existing option-source owner if an uncovered regression requires it; extend that existing test instead of copying its setup. Implement only internal refresh coordination for Plan 100. Verify: Focused and existing option-source tests pass.
5. Update read ownership guidance and record limitations. Verify: Unit, Architecture, Types, and Hygiene pass. Record pending parent review; the parent alone marks final approval.

## Done and stop conditions

- [x] Terminal failures notify once; canceled, obsolete, cached replay, and unmounted cases do not notify.
- [x] Existing data/load, normalization, undefined-result, readiness, retry, and cache contracts still pass.
- [x] Supplied query clients and lifecycle cleanup are covered through real mounted applications.
- [x] Refresh failures are observable; Plan 100 can own feedback without duplicate notifications.
- [x] All gates pass, scope is clean, and expected-red evidence is recorded.

Stop and report if the solution needs a second query scheduler, application-global mutation state, a selection contract change, or a public enable alias. Report scope expansion before editing. Stop after two bounded failed corrections at one gate; do not weaken assertions. In-series changes are expected drift and must be read and recorded.

## Maintenance

Keep notification ownership per installed client and per terminal attempt. Changes to retries, shared observers, external data, or write-owned refreshes must preserve these rules. Test-audit references unavailable OpenClaw tools; use the repository commands and report that limitation rather than claiming those tools ran.

## Execution evidence

First Luna pass stopped before full gates. Parent review requires these bounded corrections:

- A failed refresh must not leave an unobserved promise from an existing framework-owned click or loader-change watcher. The low-level refresh must still signal failure to recovery owners; mounted UI owners consume handled failures without duplicate notification.
- Preserve inactive/external-data behavior: an observer count alone does not prove a failed read is current. Do not replay an error after its load condition becomes false. Test the public current error/data/feedback behavior.
- Remove the one-caller `queryRefreshWasCanceled` constructor wrapper; use the query client's cancellation type directly.
- Invalidation must await every affected active query, including several queries in the same list/options prefix. Settling one promise per prefix is insufficient because that promise can finish on an early failure while sibling work continues. A canceled sibling must not hide a later genuine failure or release notification suppression too soon.
- Unify the resource query selection used by invalidation and feedback suppression in the existing internal query owner. Do not keep two separately maintained copies of the list/options/display filters.

The first review logs are under `plans/loom-feedback-evidence/`. The later final gates passed.

### Final execution record — 2026-10-14

Status is **IMPLEMENTED — parent review pending**. The parent owns approval.

The reader feedback owner uses the installed QueryClient. It reports one normalized terminal failure for a shared request. It ignores canceled, obsolete, inactive, and unmounted reads. A cached error does not notify on remount. A later deliberate retry can notify again. The same typed query selection now drives write invalidation and read-toast suppression. Invalidation waits for every selected active query, including siblings with the same prefix. `useOptionSource` consumes its existing refresh watcher failure.

| Gate | Command | Result |
|---|---|---|
| Focused owners | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom --reporter=dot src/query/__tests__/loader.spec.ts src/components/inputs/__tests__/option-source.spec.ts src/resources/__tests__/boundResource.spec.ts src/forms/__tests__/useFormSession.spec.ts src/components/views/__tests__/views.spec.ts src/components/core/__tests__/table-collection.spec.ts src/components/composites/__tests__/DialogForm.spec.ts` | PASS, 7 files, 165 tests |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | PASS, exit 0 |
| Loom unit | `pnpm --filter @southneuhof/loom test` | PASS, 64 files, 527 tests |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | PASS, 17 files, 79 tests |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | PASS, 35 Loom, 14 TypeScript, and 8 Vue cases |
| Architecture | `pnpm test:surface-architecture` | PASS, 34 checks |
| Hygiene | `git diff --check` | PASS, exit 0 |

The expected-red evidence is recorded in `plans/loom-feedback-evidence/parent-first-http.log` and `parent-first-diagnostics.log`. The first review reproduced a late unhandled read rejection and five failed HTTP integration cases. The added query tests also cover a canceled invalidation sibling and a later failing same-prefix sibling. The corrected diagnostic harness checks each member's exact location.

Test-audit authoring answers:

| Cases | Observable behavior and credible regression | Why current coverage was not enough | Production seam |
|---|---|---|---|
| `keeps a shared read relevant to the observer that still owns its key`; `does not report a failed record read after its identity changes`; `does not report a rejected read after its last observer unmounts` | Current observer data and toasts show whether a shared failure is still relevant. A late obsolete rejection must not toast or replace current data. | Earlier tests checked query data and cancellation, but not the mounted notification owner or a remaining observer. | None. These use mounted loaders and a real QueryClient; the toast spy observes output. |
| `reports one normalized terminal failure for observers that share a read`; `does not dispatch a disabled read and reports it after enabling`; `does not report a failed request after its last observer becomes inactive`; `reports terminal failures on the framework-created query client` | Toast count, adapter message, read count, and exposed error state catch duplicate, premature, or missing feedback. | Existing cases did not combine retries, shared observers, cached error remount, disabled state, and framework-owned client lifecycle. | None. The cases mount public `useLoader` owners and use the existing adapter input. |
| `reports a failed active sibling read when another invalidated read is canceled`; `waits for every same-prefix refresh and suppresses the later sibling failure` | The binder receives a real sibling failure after cancellation and waits for a deferred same-prefix query. | Single-query invalidation tests cannot show early settlement or released notification suppression. | None. Deferred real query functions and the existing query client control timing. |
| `reports a failed option read while the control is disabled`; `handles a failed source-change refresh without an unhandled rejection` | A disabled control can still report an enabled read failure; a source-change refresh failure has no unhandled rejection. | Loader tests do not reach the option source's watcher that calls refresh. | None. The existing option control and loader are mounted. |

Changed files for this plan: `packages/loom/src/query/feedback.ts`, `query/client.ts`, `query/loader.ts`, `adapters/plugin.ts`, `components/inputs/useOptionSource.ts`, their existing loader, adapter, and option-source test owners, `packages/loom/README.md`, and `docs/resource_system_overhaul/ARCHITECTURE.md`.
