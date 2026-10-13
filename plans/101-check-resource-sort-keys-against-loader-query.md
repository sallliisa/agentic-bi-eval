# Plan 101: Check resource sorting against the existing loader query type

## Status

- Status: DONE — parent APPROVE, 2026-10-14. Priority: P2. Effort: M. Risk: MED. Confidence: HIGH.
- Category: correctness and developer experience. Planned at: `f507f5e`, 2026-10-13.
- Depends on: none; execute serially after Plan 100 because resource type/tests are shared.
- Implementation is authorized with GPT-6 Luna at max reasoning. No commit, push, install, server/API change, or external write.


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

A returned record field is not proof that a list endpoint permits sorting by it. The table constructor currently checks record keys, while the loader already carries the query's allowed sort_by union. Connect these existing contracts at resource composition without adding a second schema parser.

## Current state

`packages/loom/src/tables/defineTable.ts:13` checks sortable columns against record keys. `contracts/tables.ts:7` defines sortKey as a record key. Preserve record display checks.

`packages/loom/src/resources/operations.ts:163` already derives the query from the loader:

```ts
type TableQuery<TTable> = TTable extends { load: (context: CollectionLoadContext<infer TQuery>) => unknown }
  ? (TQuery extends object ? TQuery : Record<string, unknown>)
  : Record<string, unknown>
```

`apps/web/src/routes/(authenticated)/settings/users/users.schema.ts:31` declares sort_by as an optional name/email enum. The typed Hono list action preserves that schema output type. `framework/hono/actions.ts:59` parses the query before dispatch. `actions.spec.ts:238` already proves runtime rejection of unsupported sort keys.

The real users resource constructs display columns first, then binds the typed loader. This separation is intentional: do not add querySchema to defineTable just to duplicate the Hono parser. Table's existing optional querySchema remains available for standalone loaders.

The app also already shares backend table-derived select schemas, audit columns, and checkedHonoRecordSchema. This plan adds no resourceIdSchema or auditActorSchema. Those proposed helpers duplicate application schema ownership.

## Exact contract

1. At defineResource list-table composition, derive allowed server sort keys from the effective loader query type's non-null sort_by values. Validate each column that can be sortable, including `sortable: boolean`, against that set.
2. An implicit sortable column uses its declared column key. An explicit sortKey uses that key. A sortable accessor still needs an explicit sortKey. Existing record-key/display safety remains intact; server aliases outside current record-key support are not added in this plan.
3. A typed query with no sort_by field permits no server-sortable column. A never/empty sort set also permits none. An unbounded query or broad string sort_by retains the existing record-key guarantees; do not claim a finite allowed set where the type supplies none.
4. A record with name/email/createdAt and query sort_by name/email accepts name and email and rejects sortable createdAt. A displayed accessor caption with sortKey name accepts; sortKey createdAt rejects even though createdAt is a valid record field.
5. Preserve literal column maps, returned record types, query types, transformed schema outputs, and readonly definitions. Do not let inference widen the loader query to accept an invalid column. Check variables and spreads as well as inline objects.
6. Report errors at the invalid column/member through the existing resource diagnostics. Keep runtime query validation exactly once in the Hono adapter. Do not inspect Zod internals, synthesize enum arrays, cast away mismatches, add a second query schema, or remove runtime checks.
7. Direct standalone Table queries retain their current runtime querySchema checks. Extending standalone constructor inference is outside this selected resource-composition repair.

## Scope

Production: `packages/loom/src/resources/operations.ts`, `resources/defineResource.ts` only if needed for its existing guard, `contracts/tables.ts` or `tables/defineTable.ts` only if the shared existing type must be extended without changing constructor members.

Tests: `resources/__type-tests__/bound-resource.type-test.ts` and `resource-actions.type-test.ts`, `contracts/__type-tests__/surface-definitions.type-test.ts` only when its existing contract participates; the existing diagnostic fixture owners under `packages/loom/test/` or `scripts/` selected by `check-contract-diagnostics.mjs` for this member. Read the actual fixture inventory before selecting a new negative and paired positive.

Documentation: Loom README, resource ARCHITECTURE, this plan and index. Application users/roles schemas and resources are read-only real compiled consumers. No API, transport runtime changes, schema aliases, dependency changes, generator, or new module.

## Commands

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat f507f5e..HEAD -- packages/loom/src/resources packages/loom/src/tables packages/loom/src/contracts` | Reconcile Plans 099/100; preserve local edits |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 with positive and negative type cases |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | Exit 0; invalid member is located with a paired valid control |
| Binder/Table | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/resources/__tests__/boundResource.spec.ts src/tables/__tests__/defineTable.spec.ts` | All selected tests pass |
| App transport | `pnpm --filter @southneuhof/framework-web test:focused -- framework/hono/actions.spec.ts` | Existing unsupported-sort dispatch rejection passes |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | No new diagnostics relative to baseline |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |
| Hygiene | `git diff --check` | Exit 0 |

## Steps and test plan

1. Read this plan, AGENTS, resource architecture, test-audit, current resource diagnostic/type machinery, and the real users typed loader. Run Drift, Types, Diagnostics, and App types baseline. Verify: exact existing errors and counts are recorded.
2. Add type-negative cases at the existing resource owner: unsupported implicit column, unsupported explicit sortKey, spread/variable definition, optional enum, missing sort_by, and possibly-true sortable. Pair them with valid columns/accessors and preserved query inference. Add no copied schema inventory or source grep test. Verify: the new negative contract is accepted incorrectly by baseline and fails the intended compiler expectation before repair.
3. Extend the existing resource list-table guard. Keep no-sort and unbounded-query cases explicit. Verify: Types, Diagnostics, Binder/Table, and App transport pass; inspect positive output inference assertions.
4. Document the resource composition check and existing runtime parsing owner. Verify: App types has no new diagnostics, Architecture and Hygiene pass. Record parent review pending.

## Done and stop conditions

- [x] Unsupported resource sorting fails during development at the column/member.
- [x] Correct implicit/explicit keys, optional query values, variable/spread declarations, and literal inference compile.
- [x] No-sort typed resources cannot declare sortable columns; unconstrained loaders retain current behavior.
- [x] Runtime unsupported-sort rejection still prevents HTTP dispatch.
- [x] No duplicate query parser, schema alias, enum reflection, or application module rewrite.

Stop if the guard can only pass by widening the loader type, suppressing diagnostics, or changing the transport protocol. Report required scope expansion before editing. Stop after two failed bounded corrections at one gate. Known unrelated renderer-type baseline errors must be recorded without repair.

## Maintenance

Allowed sort keys belong to the query contract, while display values belong to the returned record. Preserve that distinction. The backend schema import path already owns resource/audit field validity; do not reintroduce independent web schemas for those fields.

## Execution evidence

First Luna pass stopped with five expected-location failures. Parent confirmed the actual diagnostics identify the intended members, but the fixture offsets are wrong: the current generated lines are 112, 123, 134, 144, and 156, while the recorded expectations are 114, 125, 136, 146, and 157. Correct each case's own offset; do not relax the harness or accept diagnostics at arbitrary locations.

Parent app compilation also exposed a production type defect. defineTable's CompactTableColumn currently adds `sortable?: boolean` even when the author supplied no sortable member. The new resource guard then rejects valid users/roles/permissions columns as possibly sortable. Preserve authored sortable absence, false/true literals, and deliberately optional boolean values in the constructor's compact output type. Do not rewrite app modules or weaken the resource guard. Add a real defineTable-then-loader-binding positive control and an unsupported authored-sort negative, including spread definitions. An isolated HEAD app snapshot passes with exit 0; all new consumer type failures must be repaired.

### Final execution record — 2026-10-14

Status is **IMPLEMENTED — parent review pending**. The parent owns approval.

`defineTable` now preserves the author's sortability shape in its compact column type. An omitted `sortable` property stays omitted; `false`, `true`, and deliberately optional boolean values retain their meaning. Resource composition checks columns against the effective typed loader query. It keeps runtime query validation in the existing Hono adapter. The bound-resource type fixture covers constructor-to-loader inference, implicit and explicit sort keys, spreads, optional enum members, no-sort loaders, unbounded loaders, and possibly sortable columns. It has no application casts or rewritten resource modules.

| Gate | Command | Result |
|---|---|---|
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | PASS, 35 Loom, 14 TypeScript, and 8 Vue cases |
| Bound-resource tests and types | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/resources/__tests__/boundResource.spec.ts` and `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | PASS; type check exit 0 |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | PASS, exit 0; HEAD baseline is also exit 0 |
| Focused Loom owners | The 7-file focused command recorded in Plans 099 and 100 | PASS, 165 tests |
| Loom unit | `pnpm --filter @southneuhof/loom test` | PASS, 64 files, 527 tests |
| Architecture | `pnpm test:surface-architecture` | PASS, 34 checks |
| Hygiene | `git diff --check` | PASS, exit 0 |

Expected-red evidence is in `plans/loom-feedback-evidence/parent-first-diagnostics.log` and `parent-first-web-types.log`. The first location check found five intended sort diagnostics at lines 112, 123, 134, 144, and 156 instead of the expected member offsets 114, 125, 136, 146, and 157. The parent app compile also found valid users, roles, and permissions columns rejected because compact output added `sortable?: boolean`. The corrected fixture retains exact member-local checks and now passes. The independent HEAD app type baseline is clean; the historical ten renderer diagnostics are not part of this baseline.

Test-audit authoring answers:

| Cases | Observable behavior and credible regression | Why current coverage was not enough | Production seam |
|---|---|---|---|
| Bound-resource type cases for omitted, explicit, optional, spread, no-sort, unbounded, and boolean sortability | The actual `defineTable` result must bind to a loader and accept only sort keys allowed by its typed query. The negative compiler cases fail at the invalid column. | Existing standalone Table checks cover record keys and runtime query parsing; they do not connect the resource's authored columns to its loader query type. | None. They call the real constructor and resource binder. The diagnostic script uses its existing compiler fixture. |
| Existing Hono `does not dispatch when the query schema rejects a sort key` | The request count remains zero when runtime query validation rejects an unsupported key. | Type fixtures cannot prove that runtime validation still protects the request boundary. | None. The existing typed Hono client test runs at the HTTP boundary. |

Changed files for this plan: `packages/loom/src/tables/defineTable.ts`, `resources/operations.ts`, `resources/__type-tests__/bound-resource.type-test.ts`, `scripts/check-contract-diagnostics.mjs`, `resources/__tests__/boundResource.spec.ts`, and the resource architecture guidance.
