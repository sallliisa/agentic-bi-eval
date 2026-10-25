# File-routing plans

## Route generation recovery — 2026-10-25

The user selected this fix and authorized implementation by GPT 6 Luna at
max reasoning effort, with parent review under `task-subagent-delegation`.
Plan 104 uses the `improve` plan workflow at `e1a9b1c`. Planning changed only
this index and Plan 104. The existing user change in `AGENTS.md` is preserved.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [104](104-bound-route-generation-and-dev-shutdown.md) | Stop blocked owned generation safely and bound dev shutdown | P1 | L | MED | None | DONE — parent APPROVE; 235 Sprindle tests, 8 launcher tests, API/Sprindle types and lint pass; Windows/Linux unverified |

Execute 104 as one lifecycle change, then review the actual diff and test
evidence. No commit, push, publication, or upstream update is authorized.

Confirmed evidence: a live watcher held the lock, its API child served stale
routes, a second compiler timed out, and the watcher required SIGKILL after
SIGTERM. The original blocked operation remains unknown. Source confirms an
unbounded synchronous resolution probe and shutdown waits without deadlines.
An isolated generator is needed so the supervisor can stop synchronous work.

Rejected: reclaim a live owner's lock based only on elapsed time. The old
generator could resume and overwrite a newer result. Keep dead-owner recovery.

Scope is limited to Sprindle generation tooling and API development process
lifecycle. Business modules, UI, dependencies, general security, production
deployment, and the rest of the repository were not audited. No new product
direction is included. No runtime checks ran during planning.

## Green baseline and push authorization — 2026-10-14

The user authorized commit and push after confirming a green baseline.
This authorization follows the implementation-only limits recorded below.
The parent reran the root checks on the complete reviewed worktree:

| Gate | Result |
|---|---|
| `pnpm test` | PASS: 12 build/test tasks across all 6 packages, plus 34 architecture checks |
| `pnpm type-check` | PASS: all 6 packages |
| `pnpm lint` | PASS: all 3 available lint tasks |
| Web lint | PASS: 0 errors, 14 review warnings |
| Loom contract diagnostics | PASS: 35 Loom, 14 TypeScript, 8 Vue cases |
| Route source contract freshness | PASS: 8 checks |
| Module tooling | PASS: 91 Node checks and 2 Python tests |
| Diff hygiene | PASS |

Raw output is in the ignored `plans/loom-feedback-evidence/push-baseline-*.log`
files. The root test command also builds the applications. Loom browser proof
remains 17 files/79 tests from the unchanged-source parent review. Commit only
the reviewed Plans 099–103 files and push the current `main` to `origin/main`.
No manual package promotion or additional repository push is authorized.

## App test failures — 2026-10-14

The user authorized repair of the seven app route failures and three import
errors reported after Plans 099–102. The parent wrote Plan 103 and its exact
contract. GPT-6 Luna at max reasoning implements it through
`task-subagent-delegation`; the parent reviews source and evidence before DONE.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [103](103-repair-app-test-storage-and-switch-controls.md) | Real browser storage in tests; current Switch integration and selectors | P1 | S | LOW | 099–102 DONE | DONE — parent APPROVE, 2026-10-14 |

The parent reproduced all failures in the five affected files. The scope is
app test setup, two route test fixtures, and the obsolete permission-page
workaround. Packages and approved local work remain outside this repair.
No commit, push, install, or external write is authorized.

Final parent verification passes: app unit 48 files/245 tests, focused
owners 6 files/23 tests, storage 2 cases, Loom unit 64 files/529 tests,
architecture 34 checks, and focused app lint. The normal app type check passes
twice after replacing a stale ignored build-info cache. All 41 protected files
from the previous work match their recorded hashes. The earlier reported app
baseline failures in the sections below are now fixed. No commit or push.

## Loom development feedback — 2026-10-13

The user selected feedback items 1, 3, 5, and 6 for plans and implementation.
Planning uses improve at `f507f5e`. One serial GPT-6 Luna worker at max
reasoning implements the four plans through task-subagent-delegation. The
parent reads the actual diff, checks the evidence, and owns final acceptance.
No commit, push, package promotion, install, server/database operation, or
external write is authorized by this task.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [099](099-centralize-read-failure-feedback.md) | Report genuine current read failures once | P1 | M | MED | — | DONE — parent APPROVE, 2026-10-14 |
| [100](100-distinguish-confirmed-writes-from-refresh-failures.md) | Distinguish rejected, uncertain, and confirmed writes with failed refresh | P1 | L | HIGH | 099 | DONE — parent APPROVE, 2026-10-14 |
| [101](101-check-resource-sort-keys-against-loader-query.md) | Check resource sorting against the effective loader query | P2 | M | MED | Serial after 100 | DONE — parent APPROVE, 2026-10-14 |
| [102](102-prove-write-refresh-behavior-through-real-http.md) | Join real mounted views, resources, query client, and controlled HTTP | P1 | M | LOW | 099, 100 | DONE — parent APPROVE, 2026-10-14 |

Order: prepare Plan 102's primary failing HTTP proof where useful, then
**099 → 100 → 101 → 102 final proof → parent review**. Preparing a failing
regression is not completion of 102. One owner handles shared files and runs
tests only while production edits are paused.

Final checks on 2026-10-14: Loom unit 64 files/529 tests, browser 17 files/79
tests, diagnostics 35 Loom + 14 TypeScript + 8 Vue cases, and architecture 34
checks pass. App types, focused HTTP (3 files/27 tests), app lint, and diff
hygiene pass. The parent reran these gates and reviewed the final diff. The views/Form session owner gate has 2 files/89 tests pass. The
full app failure snapshot at Plans 099–102 acceptance had 7 failing tests and
3 import failures; the same failures reproduced at clean HEAD `f507f5e` in
`plans/loom-feedback-evidence/app-unit-baseline.log`. Plan 103 now passes the
full app unit suite with 48 files and 245 tests. Its required app type check
reports 10 diagnostics outside Plan 103 scope; see that plan's STOPPED record.
Parent review is complete for Plans 099–102. The clean HEAD app type baseline
has no diagnostics.

| Finding | Evidence | Impact | Confidence |
|---|---|---|---|
| No shared read notification owner | `packages/loom/src/query/loader.ts:54`, `query/client.ts:19`, `adapters/plugin.ts` | Consumer catches can report canceled or duplicated failures | HIGH |
| Write and refresh outcome combined | `packages/loom/src/resources/bindResource.ts:269`, `forms/useFormSession.ts:548`, `apps/web/src/framework/hono/actions.ts:33` | Saved writes receive uncertain/error wording; lost responses can be retryable | HIGH |
| Sort columns checked only against records | `packages/loom/src/tables/defineTable.ts:13`, `resources/operations.ts:163` | Unsupported endpoint sort values fail after development | HIGH |
| HTTP and mounted resource proof are separate | `components/views/__tests__/resource-cache.spec.ts:32`, `apps/web/src/framework/hono/actions.spec.ts:50`, `resources/__tests__/boundResource.spec.ts:605` | Mock invalidation does not prove a failed real HTTP refresh | HIGH |

Scope: selected Loom query/resource/form/delete owners, application Hono
transport and normalizer, resource sort types, and their existing test paths.
This is a focused feedback plan, not a Carta release audit. General API,
security, performance, deployment, business modules, and independent
Lookup/location/file-manager read implementations were not audited.

Considered and rejected:

- Feedback 2 declarative command presentation: rejected by the user; use
  existing slots. This series does not change its wording options or command UI.
- Feedback 4 RemoteMultiSelectInput: rejected by the user; LookupInput already
  supports the relevant selection behavior.
- New enabled aliases or a second cancellation scheduler: existing useLoader
  enabled and query-client lifecycle already own these contracts.
- A public write-result envelope or global mutation registry: extend the
  existing postWrite state and retain domain-result operation returns.
- New resource ID/audit actor schemas: backend-derived application schemas
  already own these values; no positive-ID assumption was found here.
- New module generator or reference module: Plan 073 retired scaffolding;
  real Users resource/routes already provide the compiled examples.
- Another generic harness or copied access/session test matrix: extend real
  HTTP integration proof at its owning seam.

The parent compiled an isolated source snapshot of HEAD `f507f5e` with the
installed dependencies and unchanged generated API contract; the app compiler
passed with exit 0. The prior index's ten renderer diagnostics are historical,
not the current baseline. Every new app type failure must be repaired.
Historical commit/push authorization in other index sections does not apply
to this task.

First Luna pass: STOPPED after the bounded Plan 102 correction limit. Parent
review rejected acceptance: HTTP integration has five failures and an
unhandled rejection; five compiler diagnostic locations are wrong; app types
have new errors. The parent reconciled the plans with the retained-row,
sortable-inference, completion classification, recovery-lifecycle, fixture,
and evidence corrections before requesting revision from the same worker.

Final parent verdict: **APPROVE**. Luna implemented the selected contracts.
The parent rejected incomplete evidence and stale-delete ownership, then
reconciled expected Vue setup-error cleanup after the two-round limit.
The final test-only correction removed unrelated formatting. Current parent
logs use `parent-final-accepted-*` for unit/types and `parent-accepted-*` for
browser, HTTP, diagnostics, architecture, and lint. Source changes remain
uncommitted. Feedback items 2 and 4 remain rejected.

## Loom application findings — 2026-10-12

The user selected findings 1, 3, 4, 5, 6–8, and 9. Planning uses improve at
`16e7b08`. The parent reviews, commits, and pushes to the current Carta branch.
No package promotion or merge is authorized.

| Plan | Result | Priority | Effort | Risk | Status |
|---|---|---|---|---|---|
| [093](093-time-input-confirmation.md) | Confirm time values before validation | P1 | M | MED | DONE — parent APPROVE |
| [094](094-dialog-form-close-lifecycle.md) | Keep the form through dialog close animation | P1 | M | MED | DONE — parent APPROVE |
| [095](095-switch-native-attributes.md) | Route switch attributes to the button | P2 | S | LOW | DONE — parent APPROVE |
| [096](096-textarea-native-attributes.md) | Route textarea attributes to the native control | P2 | S | LOW | DONE — parent APPROVE |
| [097](097-list-view-empty-slot.md) | Declare the existing empty slot contract | P2 | S | LOW | DONE — parent APPROVE |
| [098](098-rich-text-unused-imports.md) | Remove unused RichText import bindings | P3 | S | LOW | DONE — parent APPROVE |

Order: **093 → 094 → 095 → 096 → 097 → 098 → parent review → commit → push**.
All depend on completed Plan 092; they have no mutual production dependency.
093 and 094 share browser configuration and therefore have one implementation owner.

## Implementation handoff — 2026-10-12

All six plans are complete and approved by the parent. The parent reran the
unit, browser, Loom type, diagnostics, architecture, and diff gates. The
consumer type gate remains an accepted baseline failure. GPT 6 Luna at max
reasoning implemented the changes through task-subagent-delegation; the
parent owns the authorized commit and push.

| Gate | Command | Result |
|---|---|---|
| Loom unit tests | `pnpm --filter @southneuhof/loom test` | PASS — 64 files, 502 tests |
| Loom browser tests | `pnpm --filter @southneuhof/loom test:browser` | PASS — 17 files, 79 tests |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | PASS |
| Framework web types | `pnpm --filter @southneuhof/framework-web type-check` | FAIL — 10 diagnostics also reproduce at baseline `16e7b08`: three renderer-prop errors in `apps/web/src/framework/__type-tests__/form-renderer-props.type-test.ts`, two `FormInput` errors in `packages/loom/src/contracts/forms.ts`, four renderer constraint errors in `packages/loom/src/forms/defineForm.ts`, and one `FormRendererKey` cycle in `packages/loom/src/renderers/formContracts.ts` |
| Contract diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | PASS — 29 Loom cases, 14 TypeScript surface cases, 8 Vue surface cases |
| Surface architecture | `pnpm test:surface-architecture` | PASS — 34 tests and architecture checks |
| Diff hygiene | `git diff --check` | PASS |

Baseline regressions failed for their stated contracts. Plan 093 had no picker
confirmation action. A second temporary variant kept confirmation but restored
the deferred watcher and suppressed blur touch; its real Form browser test
failed because the required error stayed visible after committing `09:30:00`.
Plan 094 removed both forms during the closed animation;
Plan 095 put `name` on the wrapper; Plan 096 put `name` on the wrapper; and
Plan 097 rejected `#empty` in the type test. Plan 098 removed only the unused
`watch` binding; no test was justified for that import cleanup.

The browser command form `pnpm --filter @southneuhof/loom test:browser -- <file>`
ran every browser spec in the config. The full browser gate above passed.
TimeInput selects `09:30` in the real picker and asserts the exact committed
string. DialogForm uses a long test-only exit animation and dispatches its
completion after checking that the form remains mounted. A direct ListView run
also passed 3 tests. The focused unit commands for Switch and Textarea used
`pnpm --filter @southneuhof/loom exec vitest run`.

For the consumer type baseline, all six modified Loom Vue component sources
were restored from `git show 16e7b08:<path>` while their current contents were
backed up. The exact same 10 diagnostics appeared at baseline and after source
restoration. The current changes do not produce these diagnostics; no unrelated
contracts were edited.

Warnings in the successful gates were existing jsdom `localStorage` notices;
missing Reka Dialog descriptions; NumberInput placeholder and DOM `prefix`
warnings; TinyMCE evaluation-license output; and a Vue Router warning from a
browser suite that mounts outside `router-view`.

The `test-audit` skill refers to `$openclaw-testing`, `$crabbox`, and
`$autoreview`; these tools were not available here. The implementation used the
repository commands and is ready for direct parent review. No production,
external, or dependency writes were made.

| Finding | Evidence | Impact | Confidence |
|---|---|---|---|
| Time confirmation and validation | TimeInput.vue:38,75,91; datepicker-popup.spec.ts:132 | Missing confirmation and stale required error until confirmed value is validated | HIGH |
| Dialog form close lifecycle | DialogForm.vue:113,248 | Form disappears during close animation | HIGH |
| Switch native attributes and semantics | Switch.vue:114 | Attributes attach to wrapper, checked semantics absent | HIGH |
| Textarea native attributes and touch contract | TextareaInput.vue:27 and template | Native options attach to wrapper | HIGH |
| Typed empty slot | ListView.vue:47,217,674 | Supported runtime slot absent from types | HIGH |
| Unused RichText binding | RichTextInput.vue:4 | Unused watch import | HIGH |

Scope: selected Loom inputs, DialogForm lifecycle, and ListView slot typing.
General API/security/performance, resource declarations, and application pages
were not audited. README framework boundary assigns reusable behavior to Loom
and image requirements to applications.

Considered and rejected:

- Image aspect ratio warnings (finding 2): application image policy; excluded by user.
- Repeat Plan 092 required/disabled/message bindings: already implemented.
- Change all datepicker family confirmation behavior: only TimeInput selected.
- Remove TinyMCE registration imports as unused: side effects are runtime behavior.


## BaseInput validation messages — 2026-10-12

The user approved BaseInput as the sole validation message renderer. Form
keeps validation state and delegates field and summary messages. Helper text
and error text appear together below the control, in that order. Planning uses
`improve` at `684589a`. Implementation uses `task-subagent-delegation` with
GPT 6 Luna at max reasoning. Parent review is required. No commit, push,
merge, external write, or dependency upgrade is authorized.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [092](092-base-input-validation-messages.md) | One validation renderer, independent helper/error text, current control links, and migrated callers | P1 | L | MED | None | DONE — parent APPROVE; 501 unit tests, 75 browser tests, types, diagnostics, architecture, and login lint pass; local commit authorized |

Order: **092 implementation → two review repairs → parent APPROVE**.

Scope: Loom validation message composition, affected callers, stable behavior
tests, and current documentation. This is a focused migration investigation;
the API, Sprindle, and general security/performance were not audited.

Considered and rejected:

- Remove only Form's paragraph: Switch and raw custom slots would lose errors.
- Keep the helper flag: supplied text must control helper visibility.
- Drop unmatched/root issues: rejected submission must remain explained.
- Add another message component: BaseInput is the approved sole renderer.

## Enforce route import agreement — 2026-10-05

The user selected a shared check that makes route import agreement part of
normal API generation and SDK/web type checks. Planning uses `improve` at
`d47f8bf`. Implementation and parent review are authorized through
`task-subagent-delegation` with GPT-6 Luna at max reasoning effort. The
implementation agent owns Plan 091's source edits and checks. The parent
waits for completion, reviews the actual result, and owns final approval.
No commit, push, merge, database write, or dependency upgrade is authorized
for this plan.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [091](091-enforce-route-import-agreement.md) | Record actual route import targets and reject consumer disagreement through normal commands | P1 | L | HIGH | 090 | DONE — parent APPROVE; 70 tooling, 8 web, 1 API, and 34 architecture tests, all types/lint/builds pass; uncommitted |

Order: **091 implementation → two focused revisions → parent APPROVE**.

| Finding | Category | Impact | Effort | Risk | Confidence | Evidence |
|---|---|---|---|---|---|---|
| Ordinary helper imports use each consumer's resolver without an agreement check | Correctness / architecture | The SDK can accept types from a different implementation, even with equal type shapes | L | HIGH | HIGH | `packages/sprindle/src/tooling/source.ts:276`; `packages/sprindle/src/tooling/manifest.ts:46` |
| Web checks only graph freshness; standalone SDK checks only types | DX / correctness | Normal commands can accept a future import disagreement | M | MED | HIGH | `apps/web/scripts/ensure-routes-contract.mjs:12`; `packages/sdk/package.json` |

Scope: route generation, shared resolution verification, real SDK/web command
integration, focused proof, and current guidance. Current Carta imports have
no known disagreement. This is prevention, not a reported application bug.

Considered and rejected:

- Compare exported type shapes: equal shapes can hide different implementations.
- Require identical runtime/declaration package paths: valid packages use
  separate runtime and declaration files.
- Add per-route helpers or optional checks: correct behavior must follow from
  the normal commands.
- Restore RPC declaration emission or copy ordinary dependencies: retain the
  current source inference and module identity.

## Remove legacy platform resolution — 2026-10-05

The user selected full cleanup of the retired shared server/web/mobile
data-model resolution mechanism. Planning uses `improve` at `39a0768`.
Implementation, parent review, and one local commit are authorized. Use
`task-subagent-delegation` with GPT-6 Luna at max reasoning effort. The
implementation agent owns Plan 090's source edits and checks; the parent owns
final approval and the commit. No push or merge is authorized.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [090](090-remove-legacy-platform-resolution.md) | Remove platform suffix preferences, obsolete mobile exclusion, app fixture settings, and stale current guidance; reject their return | P1 | M | LOW | None | DONE — parent APPROVE; 34 architecture tests, 60 tooling tests, both real source proofs, API/SDK/web types, web build, and focused lint pass |

Order: **090 implementation → parent review → local commit**.

| Finding | Category | Impact | Effort | Risk | Confidence | Evidence |
|---|---|---|---|---|---|---|
| API and web prefer different platform files without current callers | Architecture / correctness | A new source variant can change SDK types independently of API runtime | S | LOW | HIGH | `apps/api/tsconfig.json:7`; `apps/web/tsconfig.app.json:20`; `apps/web/vite.config.ts:50` |
| App proofs retain retired web selection | Tests / DX | Proof fixtures teach a different resolution policy from the current application | S | LOW | HIGH | `apps/api/scripts/dev-source-contract.proof.mjs:152`; `apps/web/scripts/ensure-routes-contract.test.mjs:113` |
| Workspace excludes a removed mobile application | Tech debt | Configuration retains an unused old application boundary | S | LOW | HIGH | `pnpm-workspace.yaml:3` |

Scope: current app configuration, source-policy enforcement, affected source
proofs, and current guidance. Product behavior, database work, dependency
upgrades, and a general security or performance audit are excluded.

Considered and rejected:

- Remove Sprindle's generic compiler suffix support: it still implements
  current TypeScript configuration. Retain meaningful coverage with neutral
  producer/consumer examples.
- Delete historical plans, measurements, or changelog dependency records:
  they record prior source states and are not current application behavior.
- Build a complete runtime/consumer resolution comparison engine now: remove
  and reject the unused application mechanism first.

## Unified server generator — 2026-10-04

The user selected a generated TypeScript server source graph as the shared
input for runtime compilation and SDK inference. Planning uses `improve` on
branch `sprindle_unified_generator` at `dc1bc1d`. Implementation after planning
is authorized through `task-subagent-delegation` with GPT-6 Luna at maximum
reasoning effort. Run one plan at a time and wait for the agent's completion
with the collaboration wait tool. The parent reviews actual code and checks
before accepting a plan and starting its dependent plan. No commit, push,
merge, database write, external installation, dependency upgrade, or language
migration is authorized.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [087](087-generate-typed-server-source.md) | Generate precise scope-bound TypeScript source and compile runtime output from it | P1 | L | HIGH | None | DONE — parent APPROVE; 66 tooling tests, separate TS6 consumers, runtime and publication checks pass |
| [088](088-use-source-inferred-rpc-contract.md) | Use that source through normal API dev, SDK imports, and frontend checks | P1 | L | HIGH | 087 | DONE — parent APPROVE; real launcher/SDK proof, full Vue types/build, production and browser checks pass |
| [089](089-retire-rpc-declarations-and-verify-generator.md) | Remove separate RPC emission, measure frontend/editor/runtime cost, and close docs/checks | P1 | L | HIGH | 087, 088 | DONE — parent APPROVE; 220 framework and 60 tooling tests pass; normal dev limits pass, isolated median exception recorded |

Execution order: **087 → parent review → 088 → parent review → 089 → final review**.
Plan 086 is superseded. The generator remains JavaScript/TypeScript, with a
file artifact contract that a future native producer can implement. Public
framework package declarations remain separate from application RPC emission.
Source-tree pruning, standalone published SDK distribution, compiler package
extraction, and a native implementation remain outside this migration.

Vetted migration constraints from direct source reads:

| Finding | Category | Impact | Effort | Risk | Confidence | Evidence |
|---|---|---|---|---|---|---|
| Scope types exist only in a private checker overlay | Correctness / architecture | Literal server manifests alone cannot give ordinary frontend checkers precise CRUD/context types | L | HIGH | HIGH | `language.ts:101–123,193–219`; real consumer proof in the findings |
| Runtime output and SDK declarations have separate producers and paths | DX / correctness | API dev can update behavior while client types stay stale | L | HIGH | HIGH | `manifest.ts:50–87`; `apps/api/scripts/dev.ts:143–149`; `apps/api/package.json:44` |
| Direct source inference checks more backend source | Performance | Removing the type worker moves work into normal frontend checking | M | MED | HIGH for source graph size; editor cost unverified | Existing proof: 613 versus 1,746 compiler files, about 120 versus 250 MiB |
| Copying ordinary dependencies changes runtime identity | Architecture | Separate table/entity/service instances can disagree with registered runtime objects | M | HIGH | HIGH for duplicate module identity; application failure not claimed | `bindRouteEntities` and application domain/schema imports; prototype copies route dependencies |
| Old emission tests mix durable and retired contracts | Tests | Removing an emitter must retain consumer precision, reader safety, and failure recovery | M | MED | HIGH | `manifest.spec.ts`, `tooling.spec.ts`, frontend guard test |

This is a focused architecture migration, not a general framework audit.
Business behavior, permission design, Loom surfaces, production security,
database operations, and dependency upgrades were not audited. Planning read
source only and wrote these plans. Pre-existing research files are preserved.

Considered and rejected for this migration:

- A separate type worker or a second endpoint declaration ledger: superseded by
  the selected source inference architecture.
- A typed manifest that imports unbound original routes: the existing fixture
  showed widened CRUD input and missing inherited context.
- Shipping the research prototype's broad copies and regex import rewrite:
  preserve ordinary module identity and use parsed import edits instead.
- Removing all framework declarations, changing SDK transport, adding a new
  contract package, or porting the generator now: outside the selected scope.

## Automatic development workflow — 2026-10-04

Planned with `improve` at `206768c`. The user selected the recommended
workflow automation for plans and asked to record the deferred RPC type work.
The planning pass changed plan files only. It did not authorize implementation.
Continuous API development declarations stay disabled.

Execution authorized on 2026-10-04: commit the plans, then implement
Plans 082–085 with GPT-6 Luna at maximum reasoning effort through
`task-subagent-delegation`. The plans were committed as `7382ae5`.
Run one plan at a time and review the actual code and verification evidence
before acceptance. Plan 086 is excluded. No push or merge is authorized.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [082](082-prepare-current-sprindle-tooling.md) | Prepare current compiled tools/public types and replace the active compiler after framework edits | P1 | L | MED | None | DONE — APPROVE; 7 CLI/lifecycle proofs, 59 tooling tests, API 82 tests, types/lint pass; parent proof rerun passed; Windows shutdown unverified |
| [083](083-restart-api-for-runtime-changes.md) | Restart for API startup source and `.env` changes without compiling routes for those changes | P1 | M | MED | 082 | DONE — APPROVE; HTTP proofs, tooling 59, API 82, types/lint pass; parent reran both HTTP and all three launcher proofs; Windows/remote CI unverified |
| [084](084-refresh-rpc-types-before-web-checks.md) | Refresh the actual SDK contract before normal frontend checks/builds | P1 | M | LOW | 082 | DONE — APPROVE; real SDK proof, tooling 59, API/SDK/web types and web build/lint pass; parent rerun passed; Windows/remote CI unverified |
| [085](085-detect-stale-sprindle-editor.md) | Detect an old/incomplete installed editor extension through a read-only development check | P2 | M | LOW | 082 | DONE — APPROVE; CLI/installer, launcher, module-tooling, types/lint pass; parent reran 11 editor/process proofs; Windows/remote CI unverified |
| [086](086-optimize-automatic-dev-rpc-types.md) | Optimize independent type generation, fix watch/publication gaps, then enable live RPC types | P2 | L | HIGH | 082–084 | SUPERSEDED — user selected unified source inference in 087–089 |

Recommended immediate order: **082 → 083 → 084 → 085**. Plans 083–085
share the preparation prerequisite; run changes to shared scripts and
documentation in that order. Plan 086 is a separate later task. Do not
include it when executing the immediate workflow work.

Dependencies:

```text
082 -> 083
082 -> 084
082 -> 085
082 + 083 + 084 -> 086 [deferred]
```

The deferred plan records the issues that block safe enablement: the SDK
output path differs from the development manifest path; synchronous compiler
work sits before runtime publication; type-only dependencies outside routes
are not watched; and an independent worker will need correct revision,
publication, and shutdown rules. It includes a compiler feasibility check,
real SDK consumer proofs, and a baseline/candidate speed gate. Keep the
default off if those gates fail. Its proposed timing limits are acceptance
targets, not measured results.

### Vetted findings

| Finding | Category | Impact | Effort | Risk | Confidence | Evidence |
|---|---|---|---|---|---|---|
| Preparation treats one existing tool file as proof of freshness | Correctness / DX | Framework edits can leave old commands and public declarations active | L | MED | HIGH | `apps/api/scripts/ensure-tooling.mjs:11–15`; compiled import at `apps/api/scripts/dev.ts:3` |
| Startup source and environment changes are outside runtime route inputs | Correctness / DX | Server behavior stays old until a manual restart | M | MED | HIGH | `apps/api/scripts/dev.ts:18,37–43`; `apps/api/src/server.ts:22–24`; inspected runtime graph excludes server/application setup |
| Frontend guard accepts an existing stale contract | Correctness / DX | SDK checks can describe routes/types that no longer exist | M | LOW | HIGH | `apps/web/scripts/ensure-routes-contract.mjs:16–30`; `packages/sdk/src/client.ts:4` |
| Installed editor copies have no source freshness check | DX | Workspace and editor compiler/types can disagree after updates | M | LOW | HIGH | `packages/sprindle/editor/build.mjs:12–37`; `editor/install.mjs:10–15`; fixed version at `editor/package.json:5` |
| Directly enabling declarations adds work to runtime publication and misses type-only watch events | Performance / correctness | Automatic RPC types can be slow or remain stale | L | HIGH | HIGH for source/watch gaps; executor speed unverified | `manifest.ts:83–88,178,215,221,323–332,506–590`; same-session type-only fixture in Plan 086 |

Scope: Carta API development scripts, Sprindle tooling/public declaration
preparation and editor packaging, the SDK type import, frontend contract guard,
and related validation/docs. This is a focused development-workflow review.
Business modules, Loom behavior, frontend page design, production security,
and deployment were not audited. Dependency versions were read to specify
supported commands; no dependency upgrade or general vulnerability audit is
part of this work.

No builds, tests, servers, migrations, installations, or benchmarks ran during
this planning pass. Earlier same-session evidence is identified in the plans.
In particular, the API development proof's whole duration is not evidence
of route compilation speed. Plan 086 requires a new measured baseline.

### Reconciliation with existing plans

- [005](005-skip-dev-declarations.md) and
  [006](006-single-dev-compile.md) remain valid: preserve disabled inline
  declarations and one startup runtime compile.
- [007](007-narrow-route-watcher.md) remains valid: Plan 083 adds a local
  application restart watcher, not a broader route compilation watcher.
- [009](009-limit-route-declaration-inputs.md),
  [010](010-reuse-route-declarations.md), and
  [011](011-build-route-bundle-once.md) remain completed foundations.
  Preserve narrow roots, complete cache proofs, and one runtime bundle analysis.
- [042](042-gate-type-check-on-route-contract.md) remains historical DONE
  work for a missing contract. Plan 084 extends that guard to current inputs;
  it does not repeat the original existence check.
- [078–081](078-make-entity-declarations-portable.md) remain the current
  schema ownership/import architecture. Generated RPC declarations do not
  replace physical backend schema imports or require another contract package.

### Considered and rejected

| Proposal | Decision and evidence |
|---|---|
| Enable the current declaration flag now | Deferred by the user. The wrong output path and inline synchronous work are documented in Plan 086. |
| Watch the whole API project with the route compiler | Keep Plan 007's narrow contract. Startup changes need a separate restart path. |
| Add another schema/contract package or virtual import aliases | Keep the completed Plans 078–081 architecture and existing SDK contract export. |
| Automate frontend file-route generation again | Already handled by Vue Router in `apps/web/vite.config.ts` and the existing `routes:generate` check step. |
| Install or replace the editor extension automatically | External installation remains explicit. Plan 085 only detects an existing stale installation. |
| Automatically discover/register database domains | `apps/api/src/domains.ts:1–6` is deliberate application configuration. Preserve explicit registration. |
| Automatically generate/apply migrations or seed permissions | These are database writes with review/target requirements. Preserve explicit commands in `apps/api/package.json:23–37`. |
| Add another database readiness command | Existing `setup:local` and `module:preflight` own that workflow. An extra read-only pending-state notice is optional and not selected here. |
| Treat marker-only guard tests as workflow proof | Plan 084 replaces only the scoped tests with actual CLI and SDK consumer outcomes. No general test rewrite is selected. |

## Colocated portable schemas — 2026-10-01

Planned with `improve` at `8046201`. The user approved backend module
colocation, physical schema import paths, and automatic import enforcement,
then authorized one GPT-6 Luna executor with maximum reasoning effort for
each plan. Execute in dependency order and wait for each worker to finish.
No worker runs in parallel with another worker that edits these owners.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [078](078-make-entity-declarations-portable.md) | Make the existing Sprindle entity declaration seam portable | P1 | M | MED | None | DONE — APPROVE; 16 focused tests, executable browser-target bundle, package types/lint pass |
| [079](079-colocate-backend-module-schemas.md) | Keep table-derived schemas beside backend modules and migrate real callers | P1 | M | MED | 078 | DONE — APPROVE; API types/lint, six schema tests, physical package imports pass; web alias removal follows in 080 |
| [080](080-enforce-physical-schema-imports.md) | Remove API aliases and enforce direct/transitive runtime boundaries in normal Vite dev/build | P1 | L | MED | 078, 079 | DONE — APPROVE; 15 graph tests, 70 tooling tests, app types/build/lint pass; root review closes optimizer/worker/cache gaps |
| [081](081-align-module-language-and-authoring.md) | Give Carta terms and current schema authoring guidance one owner | P2 | M | LOW | 078–080 | DONE — APPROVE; glossary, live examples, five skill validators and architecture/workflow/graph checks pass |

Order: **078 → 079 → 080 → 081**. Each plan contains the intent, source
excerpts, allowed files, checks, and stop conditions for an executor without
chat history. Accepted uncommitted UI enforcement and pagination work is
recorded in [the baseline](schema-import-migration/baseline.json), with
the original diff in [baseline.patch](schema-import-migration/baseline.patch).
Preserve it. The root reviewer owns the final status after each worker returns.

Selected scope: Sprindle declaration imports, the existing API users/roles/
permissions modules, web package resolution and bundling, and relevant docs
and skills. This is not a full framework or application audit. Loom, UI design,
preview setup, database execution, and live POS feature work are excluded.

Considered and rejected: a separate contract/domain package, generated schema
contracts, a schema compiler, virtual schema aliases, a universal workflow
layer, a database binding rewrite, and a special command that agents must
remember. The supported path keeps backend ownership and portable Drizzle
metadata, with the boundary enforced by package exports and ordinary tooling.

## UI enforcement clean break — 2026-09-30

Planned with `improve` at `8046201`. The user authorized implementation by one
GPT-6 Luna executor with maximum reasoning effort. This plan replaces the live
UI source checker and UI JSON inventory; it preserves current component types,
runtime guards, independent architecture checks, and module evidence records.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [077](077-move-ui-enforcement-to-types-and-lint.md) | Move UI enforcement to normal lint/types, protect standard action slots, and remove the separate checker/inventory | P1 | L | MED | None | DONE — APPROVE; see execution record |

Plan 077 supersedes current UI-checker ownership from Plans 022, 045, and 049.
Their prior results remain historical evidence. Preview setup and browser-safe
API imports are outside this migration. Existing list/OpenAPI work is preserved.

## Loom agent authoring follow-up — 2026-09-26

Planned with `improve` at `1246387`. The user selected all four audit repairs
and both direction options, then ten ownership and workflow repairs. These
sixteen root plans are new; similarly numbered
plans inside `docs/resource_system_overhaul/findings/` are historical bundles,
not these tasks. Use full paths in handoffs.

Keep the new architecture: separate form/table/detail definitions, raw schemas,
ordinary fragments, complete prop bags, component-owned models, and resource
operation guards. These plans repair specific contracts and test whether the
result helps agents. They do not authorize another framework rewrite.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [061](061-block-repeat-submit-after-post-write-failure.md) | Keep post-write failure state and block repeat submission for the same mounted target | P1 | M | MED | None | DONE — required gates pass; three focused test-setup failures were corrected beyond the plan retry limit; see Plan 061 for evidence and unavailable test-audit tools |
| [062](062-unify-display-definition-checks.md) | Give context-free display checks one private owner | P2 | S | LOW | None | DONE — one private validator owns shared checks; focused 13, Loom 468, browser, architecture, and Types pass; OpenClaw/autoreview tools unavailable |
| [063](063-derive-renderer-types-from-runtime-roster.md) | Derive built-in component contracts from the runtime roster | P2 | M | MED | None | DONE — inferred roster and mutation probe pass; fixed incremental cross-package key recursion; Loom 468, browser 13, app types/bundle, architecture and whitespace gates pass; OpenClaw checks unavailable |
| [064](064-report-resource-contract-errors-at-the-member.md) | Locate invalid resource members and relationships in real compiler diagnostics | P2 | L | MED | None; recommended after 061–063 | DONE — 11 Vue-aware cases pass, including one union-valued action; harness binds diagnostics to the invalid fixture; Types, Binder, unit, app, architecture, and CI gates pass; see plan evidence |
| [065](065-separate-current-loom-contract-from-migration-history.md) | Keep one current contract and move migration history to a labelled archive | P3 | M | LOW | 073 | DONE — current guide and labelled archive published; open limits and compiled owners recorded in the inventory |
| [066](066-evaluate-loom-agent-repair-work.md) | Prepare five agent tasks; capture baseline early and compare named candidate checkpoints | P3 | M + measured run cost | LOW | None for baseline; candidate declares completed repairs | KIT READY / PILOT BLOCKED — Codex CLI workspace-write does not isolate outside reads; no worker sessions started |
| [067](067-make-filter-query-ownership-explicit.md) | Declare owned query keys and reverse draft mapping for filters | P1 | M | MED | None; before 069 | DONE — explicit contract, resource binding, 56 mounted view tests, architecture and app gates pass; see Plan 067 for evidence |
| [068](068-enforce-one-data-source-in-surface-types.md) | Enforce exactly one data source in public TS and Vue contracts | P2 | M | MED | 064; before 069 | DONE — types, 11 resource + 8 TS + 8 Vue diagnostics, 57 core tests including mounted source updates for all four owners, app, architecture, and whitespace gates pass; see plan evidence |
| [069](069-give-compact-form-contracts-one-owner.md) | Let form types own compact fields; let resources own binding | P2 | M | MED | 064, 067, 068 | DONE — one compact form projection supplies constructor, bound form, and filter types; cold Loom/app types, diagnostics, 478 Loom tests, app, architecture, and whitespace gates pass; OpenClaw/autoreview tools unavailable |
| [070](070-move-input-model-rules-to-component-owners.md) | Give input components ownership of prop-dependent model rules | P2 | M | MED | 063, 064; recommended after 069 | DONE — component-owned types supply Form mode checks; 23 resource/form, 9 TypeScript, 8 Vue diagnostics, 139 input tests, Loom/app types, and architecture pass; OpenClaw tools unavailable |
| [071](071-align-file-manager-values-with-canonical-assets.md) | Align the File Manager provider with canonical input asset values | P2 | M | MED | 064 | DONE — non-generic AssetValue adapter, ManagedAsset listing boundary, public type fixtures and paired diagnostics; Loom/app tests and types, architecture and whitespace gates pass; root review accepted |
| [072](072-preserve-resource-ownership-in-option-caches.md) | Refresh resource-owned option caches without private key handling | P1 | M | MED | Recommended after 070 | DONE — explicit owner keys, whole/record invalidation, mounted invalidation and namespace-removal tests, Loom/web types and architecture pass; OpenClaw review tools unavailable; see Plan 072 |
| [073](073-remove-module-scaffolding-completely.md) | Retire unused module authoring tools and remove their references | P1 | L | MED | None; before 075, 065 and candidate evaluation | DONE — source tools, fixtures, commands, historical workflow steps, and evidence ties removed; current app checks pass |
| [074](074-unify-resource-route-access-evaluation.md) | Preserve route operation and static permissions; make dynamic entry policy explicit | P1 | M | MED | 064 | DONE — Loom/Web gates pass, nested navigation fixture corrected; root review accepted; see Plan 074 |
| [075](075-decouple-transport-from-unselected-operations.md) | Permit non-list transport without a list-query schema | P2 | M | MED | 073, 064 | DONE — partial Hono routes, app diagnostics, types, and transport tests pass; root review accepted |
| [076](076-preserve-post-write-outcomes-in-delete-surfaces.md) | Preserve uncertain delete outcomes and separate write from refresh failure | P1 | M | MED | 061, 068, 064; serial with 067 | DONE — per-record UI, binder identity, diagnostics, Loom/App types, 62 view tests, and architecture gates pass; see Plan 076 |

The source plans ran in this order: **073 → 065**, then
**061 → 067 → 062 → 063 → 064 → 068 → 076 → 069 → 070 → 072 → 074 → 075 → 071**.
Plan 066 began after the source work. Its 2026-09-27 candidate capture was
pre-final and its first pilot did not start. On 2026-09-29, the fixtures passed
all applicable reference and seeded-defect checks and a fresh final-candidate
capture including product work from Plans 061–065 and 067–076 was recorded. The local Codex CLI can read outside its worker directory,
so the private grader is not isolated. Ten current run records are blocked before
start; no agent-quality result exists. Numbers reflect the execution order; use
full root paths because historical bundles reuse them.

The user replaced the old source-tool repair with complete removal. Plan 073
must not produce another source-writing system. It preserves independent evidence
recording, current app modules, and required file-route tooling. Historical
restoration instructions are removed too; Git history retains deleted material.

The cross-plan review narrowed 070 to shared component-owned rules without a
generic SFC rewrite. Plan 064 provides one bounded compiler check; its default
Loom mode stays independent of the explicit app mode added in 075. Plan 067
maps raw query state rather than falsely promising parsed values. Plan 061
excludes namespace from write-target identity. The user selected per-record
blocking for 076: resource identity is forwarded once, and other records remain
usable. Run edits to shared owners serially and reconcile earlier evidence
instead of treating every unrelated change as a reason to restart discovery.

Plan 066 is ready for measurement, but its local pilot is blocked by read
isolation. Its ledger separates both historical blocked records and the current
harness block. No agent-quality comparison has run. This does not block the
other plans.

Each plan contains its own intent, current excerpts, scope, target decisions,
ordered steps, commands, meaningful test cases, done criteria, and stop rules.
Read the entire selected file before follow-up work. The original planning pass
did not edit code, tests, skills, or framework documents. The later source-plan
implementations and Plan 066 preparation are recorded in their plan files.

Audit evidence: Loom cold type check passed; Loom unit suite passed **450 tests
in 61 files**. An in-memory compiler probe reproduced the opaque `never` error
for an extra `create.typo` member with a valid control. The post-write repeat
submission risk and duplicated display/renderer contracts were confirmed from
source. Follow-up probes also confirmed transformed filter hydration failure
and acceptance of both/neither Table/Detail source bags by TypeScript. Vue
source-union enforcement remains unverified. The form/model duplication and
File Manager contract mismatch were confirmed from source. Further in-memory
probes confirmed resource invalidation misses option entries, the route guard
omits permission arrays, and a create-only Hono query guard becomes never while
a list-bearing control compiles. Delete outcome handling and old authoring-tool ties
were confirmed from source. These are not measurements of agent performance. New regression,
browser, app, diagnostic-harness, and evaluation checks
are future execution gates, not completed evidence. The audit did not cover
backend/Sprindle security, dependency advisories, broad performance, or all
application behavior.

### Considered and rejected

- Reintroduce universal fields or schema wrappers: would restore the coupling
  removed by the overhaul.
- Delete constructors, guarded operation wrappers, or Views just because they
  are small: they own typing, policy, or lifecycle behavior.
- Rewrite the multi-app/SSR resource runtime: explicitly deferred by the current
  architecture and outside these findings.
- Solve post-write uncertainty with automatic retry, fabricated success, or a
  generic unlock button: none proves that the server rejected the first write.
- Change renderer override policy while removing the duplicate built-in list:
  that is a separate public-contract decision.
- Assert exact compiler prose or source helper names: the contract is useful
  error location/meaning, not compiler printing or implementation structure.
- Merge File Manager listing/folder operations into the asset service: they
  have different responsibilities. Only the provider value contract is narrowed.
- Infer a filter inverse from schema transforms or field names: the author must
  define the reverse mapping and all query keys the filter can clear.
- Claim that shorter documentation proves agent efficiency: Plan 066 requires
  observed runs and separates the current repairs from the original overhaul.

## Test audit repairs — 2026-09-26

User-selected follow-up plan at `1246387`. Execute the baseline, migration
guard, entity import guard, duplicate removal, then final checks in that order.
SDK cleanup is a separate follow-up that needs explicit framework scope.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [060](060-test-audit-repairs.md) | Repair two ineffective guards and remove duplicate schema coverage | P1 | S | LOW | None | BLOCKED — implementation complete; mandatory autoreview unavailable; three baseline web setup failures |

Considered and rejected: deleting the entity architecture scan or the SDK
type contracts. Both protect independent boundaries. This plan covers the
four selected test findings; it does not claim a full repository audit.

## Module development skill overhaul — 2026-09-26

User-selected audit and implementation at `1246387`. The findings, scope,
rejected alternatives and checks are in the plan. No dependencies.

| Plan | Result | Priority | Effort | Risk | Status |
|---|---|---|---|---|---|
| [059](059-module-development-skill.md) | Short module workflow with current surface contracts and non-browser worksheet checks | P1 | M | MED | DONE — skill, worksheet, tooling, architecture, and link checks pass |


## Resource surface architecture overhaul — 2026-09-23

Planned with `improve` at `40afee2` against
`docs/resource_system_overhaul/ARCHITECTURE.md`. This is a focused migration
audit of Loom, Carta web callers, module tooling, and active guidance. The user
selected the complete breaking change and no backwards compatibility. The
eight plans below are one delivery track. Each file is self-contained; read it
in full before execution. Intermediate plans can have documented unmigrated
caller errors. Plan 058 cannot be marked DONE until the executable old path is
gone and all required, available gates pass.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [051](051-surface-contracts-and-schema-compiler.md) | Independent contracts, raw-schema compiler, labels, registries, inventory and cold baseline | P1 | L | HIGH | — | DONE — 24 focused and 515 Loom tests pass; web types pass; 37 Loom template-prop diagnostics and 4 baseline web test suites are recorded in the inventory |
| [052](052-form-session-and-dialog-parity.md) | One Form session and flat DialogForm parity | P1 | L | HIGH | 051 | DONE — 36 focused and 27 browser tests pass; 37 prior template errors, 9 old caller type errors, and 17 old view tests are recorded for later plans |
| [053](053-display-primitives-and-export.md) | Shared Table/TreeTable/Detail display and export reads | P1 | L | HIGH | 051 | DONE — 79 focused Loom, 11 focused browser, and 7 utility tests pass; later caller failures and 50 type diagnostics are recorded in the inventory |
| [054](054-resource-binding-and-view-bags.md) | One-object resources and complete primitive/View bags | P1 | L | HIGH | 052, 053 | DONE — 106 focused tests and ListView browser pass; full suites leave only Plan 055 TableInput/LookupInput failures; 35 later-plan/final-gate type diagnostics are recorded in the inventory |
| [055](055-composite-input-ownership.md) | Explicit filters, row forms, lookup loaders, and location editor | P1 | L | HIGH | 052, 053, 054 | DONE — reviewed after revisions; full Loom unit 502/502 and browser 34/34 pass; only two Plan 058 Drawer/Tabs type diagnostics remain |
| [056](056-migrate-web-surfaces-and-app-seams.md) | All web settings modules, routes, app seams, and presets migrated | P1 | L | HIGH | 054, 055 | DONE |
| 057 | Historical source-tool work, retired by Plan 073 | P1 | L | MED | 056 | RETIRED — current app modules use direct authoring |
| [058](058-remove-legacy-paths-and-prove-completion.md) | Old code/exports removed; architecture gate and full verification | P1 | L | HIGH | 051–057 | DONE — reviewed after revisions; all required gates pass |

Execution order: **051 → 052 → 053 → 054 → 055 → 056 → 058**.
Plan 073 retires the old source-tool step. The remaining migration records are
historical. Do not ship a partial migration as the final architecture.
Keep framework/API and app transport contracts unchanged, as the specification
requires. The user request explicitly includes Loom framework changes.

### Vetted migration findings

| Finding | Impact | Effort | Fix risk | Confidence | Evidence | Plan |
|---|---|---|---|---|---|---|
| Universal fields and wrapped schemas couple the three surfaces | Blocks independent type-safe authoring and raw input/output inference | L | HIGH | HIGH | `packages/loom/src/contracts/fields.ts:97-125`; `packages/loom/src/validation/zod.ts:66-90` | 051 |
| Form and DialogForm have different binding paths | Override, model-presence, and session parity cannot follow the target contract | L | HIGH | HIGH | `packages/loom/src/components/core/Form.vue:62-70`; `packages/loom/src/components/composites/DialogForm.vue:51-76` | 052 |
| Read-only surfaces and export depend on universal resolved fields | Shared accessor/format and relation captions cannot have one owner | L | HIGH | HIGH | `packages/loom/src/components/core/Detail.vue:21-45`; `packages/loom/src/services/export.ts:1-13` | 053 |
| Resources and Views still expose dual/aggregate shapes | Extracted primitive bags are not the target guarded operation contract | L | HIGH | HIGH | `packages/loom/src/resources/defineResource.ts:25-44`; `packages/loom/src/components/views/FormView.vue:41-82` | 054 |
| Composite inputs own implicit fields and cross-form writes | Nested rows/lookup cannot share the new form/display boundaries | L | HIGH | HIGH | `packages/loom/src/components/composites/form-inputs/TableInput.vue:23-35`; `LookupInput.vue:27-47` in the same directory | 055 |
| Web declarations and defaults remain on the old model | Current settings pages cannot compile after old API deletion | L | HIGH | HIGH | `apps/web/src/routes/(authenticated)/settings/users/users.resource.ts:1-19`; `apps/web/src/configs/defaults.ts:23-55` | 056 |
| Retired authoring tools left a risk of restoring old code | A fresh module could regress the migration | L | MED | HIGH | Plan 073 removes the tool paths; independent UI checks remain | 073 |
| Public exports and normal validation still allow old paths | A clean break cannot be proved | L | HIGH | HIGH | `packages/loom/src/index.ts:1-8`; `packages/loom/vitest.browser.config.ts:12` | 058 |

### Scope and decisions

- This audit covered `packages/loom`, the relevant `apps/web` resources and
  framework adapters, application scripts and checkers, active docs/skills, and their
  verification configuration. It did not audit Sprindle, SDK, utilities, API
  implementation, dependency security, unrelated product features, or broad
  performance. Those areas are outside this migration except final workspace
  regression gates.
- The checked-out revision has no working-tree changes before these plans.
  Planning did not run type-check, unit, browser, build, or E2E commands. Plan
  051 records the cold baseline; Plan 058 records the candidate and final gates.
- Considered and rejected: compatibility overloads and aliases, because the
  requested architecture explicitly removes them; backend response changes,
  because the target preserves transport envelopes; one plan for the entire
  overhaul, because it would hide ownership, test, and dependency boundaries.

## Chokidar watcher migration — 2026-09-17

Planned with `improve` at `bf9a7ce`. The user approved the Chokidar
dependency and selected tests-then-migrate. Plan 039 locks the watcher
contract. Plan 040 was attempted twice on `advisor/040-chokidar-watcher`
and REJECTED on review: file-path watching lost add/rename/external-edit
events, dir watching flaked the external-cycle test in full-suite runs,
and installed `chokidar@5.0.0` still uses per-path `node:fs` watchers
(no `fsevents` dep), so the low-limit dev run still hit `EMFILE`.
Replan 040 from this clean slate. Plan 039 tests must pass unmodified
under any new attempt.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [039](039-lock-watcher-contract-tests.md) | Lock route watcher add, rename, delete, and ignore rules with tests | P1 | S | LOW | None | DONE (manifest.spec 29 pass, lint 0, dev-routes pass, 354ae9d) |
| 040 | Chokidar watcher migration | P1 | S | MED | 039 | REJECTED — file watching lost events, dir watching flaked, EMFILE premise false; replan from clean slate |
| [041](041-migrate-sprindle-watcher-to-chokidar.md) | Chokidar 3.6 native watcher with atomic-input and macOS low-limit proofs | P1 | M | MED | 039 | DONE — 2026-09-18, review APPROVE; tooling 58 pass, watch 12 pass x3, lint 0, low-limit proof pass (fsevents, ulimit 128), dev-routes pass with DATABASE_URL, frozen lockfile 0, diff clean; branch `advisor/041-chokidar-3-watcher` |

Plan 041 keeps the public signature, debounce, queue, and close contract.

Plan 040 must pass plan 039 tests unmodified.
Plan 040 keeps the public signature, debounce, queue, and close contract.
Audit scope was limited to the Sprindle route watcher and its dev proof.
Product behavior, databases, broad framework quality, dependency security,
performance, and frontend behavior were not audited.

## Windows tooling portability — 2026-09-17

Planned with `improve` at `83c13b4`. The user selected all three findings as
one implementation because the cold tooling build, API filesystem paths, and
Windows regression gate must land together.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [038](038-make-api-tooling-windows-portable.md) | Portable Sprindle tooling, API paths, subprocesses, and Windows CI | P1 | S | LOW | None | DONE — 2026-09-17, review APPROVE; cold tooling, dev startup, bundle, types, lint, and 4 focused tests pass on Windows |

Plan 038 is independent of the pending Loom plans 034, 035, and 037. It changes
only the reported Sprindle/API tooling path and its CI proof. Ad hoc
leading-slash removal, shell-launched `.cmd` files, and a two-file partial fix
were rejected because they leave encoded/UNC paths, quoting, or later API
failures unresolved.

Audit scope was limited to the reported Windows tooling and API startup/build
chain. Product behavior, databases, broad framework quality, dependency security,
performance, and frontend behavior were not audited.

## Resource and form contract enforcement — 2026-09-17

Planned with `improve` at `9d5f03e` and revised by user decision on 2026-09-18.
These plans put resource checks and component-derived form prop types in Loom
and the app schema seam. They add no agent workflow requirements. Plan 036 was
dropped because rejecting field references would remove valid custom-form and
multi-schema composition paths.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [034](034-enforce-resource-action-declarations.md) | Exact standard actions and managed open-name custom actions | P1 | M | MED | None | DONE — reviewed 2026-09-18; Loom Types 0, 31 resource+field tests, 8 custom-action route tests, 229 web, 467 Loom (final combined tree), focused lint 0, diff --check 0; Web types fails only on the pre-existing `rpc unknown` baseline (stashed-tree identical, owners clean) |
| [035](035-enforce-resource-identity.md) | Valid identity declarations and checked runtime identities | P1 | M | MED | 034 | DONE — reviewed 2026-09-18; Loom Types 0, 38 resource+cache tests (incl. 4 identity), 1 app schema test, 467 Loom, 229 web, focused lint 0 errors (1 pre-existing TQuery warning on clean tree), diff --check 0; Web types fails only on the pre-existing baseline (owners clean) |
| [037](037-enforce-form-renderer-contracts.md) | Component-derived form prop types with open extra props | P1 | M | MED | None | DONE — reviewed 2026-09-18; Loom Types 0, 45 registry+field tests, 467 Loom, 229 web, focused app lint 0 errors, diff --check 0; Web types fails only on the pre-existing baseline (owners clean); one contract-preserving test-fixture correction recorded in the plan |

Recommended order: **034 → 035**, with **037** independent. Execute serially
when the plans touch the same framework type files. Read each plan fully before
execution. Each plan contains its own context, scope, commands, failure cases,
and stopping conditions.

### Confirmed findings

| Finding | Impact | Effort | Fix risk | Confidence | Evidence |
|---|---|---|---|---|---|
| Extra options inside standard action declarations survive generic constraints | Ignored configuration, including a misspelled client permission | M | MED | HIGH | `packages/loom/src/resources/defineResource.ts:15`; `packages/loom/src/resources/actionResource.ts:145` |
| Custom actions expose raw `run` functions and have no resource-owned permission rule | Callers must copy permission-store logic and can omit it | M | MED | HIGH | `packages/loom/src/resources/actionResource.ts:657`; the role-assignment and role-permission route components |
| Identity declaration can name an absent record property | Invalid navigation/write/cache identity | M | MED | HIGH | `packages/loom/src/contracts/schema.ts:34`; `packages/loom/src/resources/actionResource.ts:404`; `apps/web/src/framework/schema.ts:68` |
| Form renderer props are broadly typed | Values that conflict with component `defineProps` pass normal type checks | M | MED | HIGH | `packages/loom/src/contracts/fields.ts:91`; `packages/loom/src/fields/defineFields.ts:105`; `packages/loom/src/components/inputs/FileInput.vue:20` |

These are correctness/type-contract findings. The permission issue concerns
client configuration; no server authorization bypass was established.

### Baseline evidence and limits

- Loom `vue-tsc --noEmit --incremental false -p tsconfig.json`: passed.
- Five focused Loom test files: **50/50 passed** (`resources`, `defineFields`,
  `resolve`, `inputProps`, and renderer `registry`).
- Compiler probes confirmed accepted invalid standard action options, identity
  keys, file props, and renderer names.
  Positive controls confirmed standard return types, initial values, field keys,
  known option value types, and custom call arguments are checked.
- Form prop enforcement is compile-time only. Runtime prop safety is reserved
  for a later decision. Identity checking must cover the inferred app schema seam.
- Planning changed only these plans and this index. Implementation is not done.
  The full web suite, browser behavior, and new rejection checks were not run as
  completed implementation evidence.
- Field-reference inputs remain supported. Their current runtime behavior is not
  changed by these plans.

### Considered and rejected

- More skill instructions for every input: the requested invariant belongs in
  the framework.
- Accepting string `accept` values through coercion: retains an ambiguous contract.
- Treating all of `defineResource` as untyped: incorrect; several important
  existing checks work and must remain.
- Requiring all route parameters: conflicts with the established inherited
  parameter contract from Plans 031–032.
- Removing custom renderers/actions: they are supported extension points.
  Custom renderer props are inferred from the declared Vue component type.
- Keeping custom permission checks only in route components: rejected because a
  direct custom `run` call can omit them. The resource action owns `can` and the
  final `run` guard.
- Rejecting field references from core forms: rejected because real custom forms
  can combine fields from several schemas and need this escape hatch.
- Runtime form prop validation: deferred. Agents and developers use the package
  type-check commands for this contract.
- A full security or framework audit: outside the selected work. Sprindle,
  database behavior, dependency security, performance, display renderer typing,
  and product direction were not audited.

## Managed dialog forms — 2026-09-17

Planned with `improve` at `5cafda4`. The user selected this migration. Plan 033
keeps visibility inside DialogForm by default and retains controlled visibility
as the advanced option. Existing framework migration plans use this directory.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [033](033-managed-dialog-forms.md) | Managed triggers, safe completion order, independent row dialogs and updated guidance | P1 | M | MED | None | DONE — reviewed 2026-09-17; 30 focused, 454 Loom, and 229 web tests pass |

Implementation followed the steps in 033. The completion-order regression was
red before the one-line framework fix. Loom and web type checks pass; route
generation produced no diff. Both changed skills validate. The forward test
stays stashed. No database or package publishing work is included. Reviewer
verdict: APPROVE.

Considered and rejected: public sessions; shared action-owned visibility (action
objects are cached); closing on submit start or unmount; a new controlled-dialog
alias; and treating internal visibility as missing functionality (it already exists).
The confirmed gap is completion order and the normal examples/tests favoring
external ownership. Confidence: HIGH. Whole-repo audit was not requested.

## Typed resource routes — 2026-09-16

Planned with `improve` at `c5d8f9b`. The user selected this migration, so no
general audit or additional selection step was needed. Existing plans use this
directory for framework and application migrations; numbering continues at 031.

| Plan | Result | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [031](031-check-resource-route-names.md) | Reject unknown names with fresh generated route types | P1 | M | MED | None | DONE — 2026-09-16, approved after one test revision |
| [032](032-check-resource-route-parameters.md) | Check supplied parameters and preserve inherited values | P2 | M | MED | 031 | DONE — 2026-09-16, approved after two plan reconciliations |

Execute 031 before 032. Plan 031 includes generation, the normal compiler gate,
and a stale-map regression. Plan 032 retains optional inherited parameters;
it does not claim to prove that runtime parent context exists.

Evidence: `packages/loom/src/resources/actionResource.ts:39` accepts any string
name and broad parameter records. `apps/web/package.json` type-check does not
generate route declarations. `apps/web/src/router/tabs.ts:4` already demonstrates
typed names with partial raw parameters. These findings have high confidence.

Considered and rejected: regex as the primary route contract; per-resource
opt-in helpers; mandatory parameters that break inherited parent context;
manual route maps; and runtime navigation changes in a type-only migration.

Planning inspected Loom resource types, web route generation, package commands,
the relevant CI jobs and existing route tests. No source was changed in this
planning turn. Commands are specified from source; implementation checks have
not run. API behavior, databases, security, performance, UI controls and other
Carta applications were not audited. Existing work remains unchanged.

## Current skill handoff — standard module path, 2026-09-14

Skill updates are ready; the stopped trial's database baseline is not verified.
Standard CRUD now uses one
short work record, one continuing executor and an early development preview.
Custom workflows build on that base in the same record. Full design/plan/worksheet
records apply only to a scope that needs them, not to every module with a workflow.
Relation display and edit values, requested access and usable results lead review.
Standard detail pages do not gain custom Edit/Delete controls by default.

Current delivery instructions are in
[`carta-module-development`](../.agents/skills/carta-module-development/SKILL.md).
Forward verification of this revision is reserved for the user. Plan 024 is
already implemented (see the table below); plan 025 remains optional
follow-up work, not a prerequisite for this trial. The short
path uses existing controls, ordinary evidence and direct module authoring.
No new source-writing command or connected-entity framework repair is claimed
as implemented. Current app and route-type checks remain available.

The follow-up also reconciles the API runbook and replaces the file-upload
test's shared-table reset with existing session fixtures. No database or framework
changes were made by this follow-up.

Before the next trial, use a confirmed isolated database whose migration history
matches the selected source revision. Run the focused file-upload tests twice,
then the API suite to check cross-file effects. These runtime checks remain
unverified: the current target has unresolved drift and no local PostgreSQL or
Docker command was available. Do not reset the existing target to complete them.
Plan 024 is already implemented; keep 025 deferred. Forward
verification is reserved for the user; no speed or reliability claim is made.

## Earlier module skill follow-up — 2026-09-14

The following notes record earlier revisions. The current handoff above governs
where their worksheet procedure differs.

Discovery/test follow-up: layer skills now read broad architecture, registration
and export references only for an unresolved fact. Discovery reports occur after
initial owner reads and again after ten further files or five minutes without a
change. The threshold triggers communication, not a forced write. Plans pass
pattern decisions, reasons and revisions. The first working result includes a
brief review of test justification before the pattern is repeated.

Forward verification measures reads that resolve no new fact, time to
communication and first working output, and test repair cost. Bounded harmless-change and fault
probes check both test stability and useful detection. These evaluations remain
TODO; the wording changes make no claim of measured speed or reliability.

The user selected skill changes first, then plans for tool fixes and forward
tests. Plan 021 was retired under Plan 073; Plan 022 remains a historical record.
The skill revision uses CRUD tables and custom workflow YAML, reuses discovery,
checks the current app contracts before detailed planning, and assigns one
working path first.
The worksheet parser now reads CRUD tables as well as custom workflow records.

The final wording pass moved custom workflow YAML into a conditional reference,
defined shared rules with I-IDs, and removed repeated procedures from stage
entry points. The checker reads all repeated tables and rejects duplicate rule
and acceptance IDs. Early dependent assignments stay in one plan; cross-plan
dependencies require the complete predecessor.

| Plan | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|
| 021 | Historical submit workflow, retired under Plan 073 | P1 | S | LOW | None | RETIRED — current app modules use direct authoring |
| [022: Report raw controls](022-report-raw-interactive-controls.md) | P1 | S | MED | None | DONE — 2026-09-14, native controls reach review, 18 tests pass |
| [024: Prove shared form controls](024-prove-shared-form-controls.md) | P1 | M | MED | None | IMPLEMENTED — 2026-09-14, real Dialog/Table/calendar cases pass, helper regression passes |
| [025: Separate runtime and review freshness](025-separate-runtime-and-review-freshness.md) | P2 | S | MED | None | TODO |

Run the manual trial with the current skills. Plan 024 is already implemented
as recorded in the table above; plan 025 can follow
when its gap is relevant; it does not block this trial. Preserve existing
plan status and user application work.

| Finding | Category | Impact | Confidence | Evidence |
|---|---|---|---|---|
| Raw controls pass without review | DX/tests | Framework replacements can be missed | HIGH | `scripts/module-ui-check.test.mjs:22` |
| Revised delivery behavior is unproved | Tests | Time and completeness remain uncertain | HIGH | Forward test run facts |

Earlier considered and rejected: removing the worksheet (then judged small;
superseded for standard CRUD after the later 102-edit planning trace); adding a
new source-writing tool or skill (direct app authoring is current); automatic
relation/workflow decisions (business rules remain manual); calling static pass
acceptance. Earlier run reports remain historical, not proof of this revision.

Scope: selected module skills, UI checks, and evaluation
contracts. No full application, framework, security, dependency, deployment or
performance audit was performed. No new product direction was requested.
Skill validation passed for six changed skill folders, seven Node skill checks
passed, and two Python tests passed with new CRUD acceptance cases. The first
Python run failed because fixture tables lacked a separating blank line; the
fixture was corrected. Full runtime forward tests remain unrun.

Final handoff checks: `pnpm test:module-tooling` passed 92 Node tests and three
Python tests. Four workflow skill validations and `git diff --check` passed.
An old Node assertion required command text in the router; it failed after the
procedure moved to its reference. That wording assertion was removed. The
reference-link checks remain. All five final skill changes are complete.
The next skill pass defines framework/module test ownership in one reference,
checks assertions before expensive runs, and requires page/artifact diagnosis
after two failures at one browser interaction. Plan 024 closes real-control
coverage gaps and supplies shared helpers. Plan 025 separates runtime freshness
from design review; current recorder rules remain in force until it is complete.
Application and framework source were not changed in this skill pass. The new
rules still need the controlled trial; no speed improvement is claimed.

Checks for this pass: 96 Node tooling tests and three Python tests passed.
Both changed skill folders passed skill validation; `git diff --check` passed.
Framework browser tests and the controlled trial were not run. Concurrent
application changes were left untouched.

Planned with the improve skill against checkout `00763ed` on 2026-09-08.
Both plans passed parent review on 2026-09-09.

## Status

| Plan | Priority | Depends on | Status |
| --- | --- | --- | --- |
| [001: Hidden tooling and editor support](001-hide-route-language-and-build-work.md) | P1 | None | DONE |
| [002: Framework and app migration](002-migrate-sprindle-and-carta-file-routes.md) | P1 | 001 | DONE |
| [003: Reject route import cycles](003-reject-route-import-cycles.md) | P1 | None | DONE |
| [004: Preserve external declaration paths](004-preserve-external-declaration-paths.md) | P1 | 003 | DONE |

## Delivered contract

HTTP methods and paths come from `+server.ts` files and named method exports.
Parent `+scope.ts` files supply context, identity, access checks, entities, and
record conversion. Parent hooks receive their own context and identity. Child
context can replace fields for descendants without changing parent checks.

Developers can add, move, or delete routes without a registration edit,
generated import, manual context type, or generation command. The normal build,
type-check, test, and development commands maintain private artifacts. The SDK
uses declarations emitted from the same contextual type view as the editor.
Type-only changes update those declarations. Plain consumer TypeScript checks
work after application route source is removed.

All 27 existing API method/path pairs are preserved. Database domain ownership
is separate from route ownership. Production runs in plain Node from a shared
ESM bundle. Development and tests use separate source manifests, so app request
state is shared and simultaneous build/test commands do not replace each
other's artifacts. No production request scans source files or loads a compiler.

## Parent verification

The parent ran these checks against the final implementation:

- `pnpm build --force`: six tasks passed, zero cache hits.
- `pnpm type-check --force`: six tasks passed, zero cache hits.
- `pnpm lint --force`: three tasks passed, zero cache hits.
- `pnpm test --force`: twelve tasks passed, zero cache hits. The unrestricted
  Sprindle suite has 184 tests; API has 72, SDK has 3, and web has 216.
- `pnpm test:module-tooling`: 47 tests passed.
- Sprindle isolated VS Code editor-host and editor-install tests: exit 0.
- [Language proof](proofs/file-routing/LANGUAGE.md): ten checks passed.
- [Runtime proof](proofs/file-routing/README.md): thirteen checks passed,
  including the counterexample for manifest-only source type inference.
- Cold normal development startup: HTTP asset URL projection, route addition,
  invalid-edit recovery, route move, and route deletion passed.
- Cached build and type-check after output removal: six cache hits each;
  required binaries, declarations, and API artifacts were restored. The SDK
  consumer check passed after each restoration.
- Direct plain Node import of the production application returned 200 from
  `/health`. The isolated production test runs a copied bundle without app
  source, the Sprindle package, or a TypeScript loader.
- `git diff --check` and the obsolete production registration search passed.

The API test target guard reported `VALID` for the separate `carta_test`
database before migrations and tests. The existing ignored `.env.test` was
missing its purpose and name markers; those two markers were added. Database
credentials and the target URL were not changed.

Earlier review failures were corrected before approval. The full framework
suite is enabled. Tests cover parent rejection and error unwinding, middleware,
parsed write hooks, type and runtime inheritance, declaration publication from
concurrent processes, failed-build preservation, path aliases, exact literal
outputs, type-only edits, and production/development request state.

## Editor setup and limits

Run `pnpm setup:editor` once to install the project language support. No route
generation command is needed. The parent tested installation in an isolated
profile; the user's editor profile was not changed.

VS Code 1.136.1 on macOS is the tested editor. The extension supports one
TypeScript project at a time. Context rename refuses edits because complete
cross-file references cannot yet be proved. Source add, move, and delete,
context inference, diagnostics, completion, and definitions are supported.
See [tooling documentation](../packages/sprindle/docs/file-routing-tooling.md).

## Boundaries

Work stayed in the current checkout. No other branch, worktree, or historical
implementation was inspected. No commit, push, publication, deployment,
application schema migration, or development database reset was performed.

## Follow-up plan 003

Plan 003 was written with the improve skill at `83c0cf9` on 2026-09-10.
It is independent of other pending module work. It preserves the completed

The bundle contains the reported undefined auth domain. A focused check also
found that native ESM fails when the same graph is loaded through the scope
first. The plan therefore breaks the application cycle and rejects static
local import cycles before publication. It also gives E2E its own source
manifest so application modules are shared.

Considered and rejected: treating the graph as safe for every ESM entry order;
waiting for route readiness; skipping undefined domains; changing import order
to hide the fault; and adding a new compiled-module system for this fix.

Planning checks: six existing Sprindle manifest tests passed. The minimal
in-memory reproduction confirmed both the native ESM initialization error and
the delayed bundle error. No database reset, live HTTP check, or browser E2E
was run. This was not a full framework or repository audit.

Final review of plan 003 passed on 2026-09-10. The standard Sprindle tooling
suite passed all 37 tests after the timeout and process-cleanup correction.
The API build and all 4 selected API tests passed. Type-check, lint, and patch
checks passed. Browser E2E was not run. See the plan for the full evidence,
earlier failures, and the separate external declaration-emission limit.

## API dev-startup performance — 2026-09-11

Planned with the improve skill against checkout `99d77a5` on 2026-09-11.
Scope: `perf` only. The user reported ~15 s dev startup (2741 ms compile +
6767 ms watcher + 1162 ms manifest load). The user selected the top 2
findings for plans. Read-only analysis only; no source changed during
planning. Working tree was clean (`git status --short` empty).

### Measured evidence (all on this checkout, `bundle=false`)

- Full API compile: 2424 ms cold-ish, warm 1959 ms. Scope: 24 routes,
  5 scopes, 29 route files plus ~44 esbuild metafile inputs.
- 1-route fixture compile: 326 ms cold, 143-161 ms warm. Fixed declaration
  cost dominates the API compile.
- Manifest import under tsx: 936-1372 ms, stable across runs. Plain Node
  import was not measurable (source manifest holds `.ts` specifiers).
- Server phases on port 5199 reproduce the report: manifest 1191 ms,
  app 24 ms, database 2 ms, bind 0 ms.
- Framework imports under tsx: sprindle/hono ~700 ms, create-app ~788 ms,
  db module ~632-674 ms, first `getDb()` ~1 ms, `defineDomainSchema` ~1 ms.

### Findings table

| # | Finding | Category | Impact | Effort | Risk | Evidence |
|---|---|---|---|---|---|---|
| PERF-01 | Dev, test, and temp manifests emit TypeScript declarations | perf | ~2 s of every ~2.4 s dev compile; 3 compiles per startup | S | LOW | `packages/sprindle/src/tooling/manifest.ts:69` always calls `emitRouteDeclarations`; dev uses `.sprindle-dev` (`apps/api/scripts/dev.ts:5`), test uses `.sprindle-test` (`apps/api/scripts/compile-routes.ts:2`), temp dir in `apps/api/scripts/build-production.ts:14` |
| PERF-02 | Dev startup compiles the manifest 3 times | perf | 2 redundant ~2.4 s compiles before the server starts | S | LOW | `apps/api/scripts/dev.ts:9` explicit compile, then `watchRouteManifest` runs `compile(); await queue; compile(); await queue` (`packages/sprindle/src/tooling/manifest.ts:252`) |
| PERF-03 | Watcher scans the whole API project, not routes plus inputs | perf | Every keystroke recompiles on any project file change; dozens of watchers held open | S | LOW | `watch(project, { recursive: true })` at `manifest.ts:235` plus `directories(project)` at line 240; 51 watch-candidate dirs counted; no route/input scoping |
| PERF-04 | Dev manifest is source-only while production is bundled | perf | ~1 s tsx transform per server start plus per-route transform churn on reload | M | MED | `dev.ts:9` and watcher use `bundle=false`; production `tooling/build.mjs:8` bundles; manifest import under tsx measured ~1 s |
| PERF-05 | Versioned `contracts/` dirs accumulate, stale tmp files remain | perf | 8.7 MB across 10 contract versions in `.sprindle-dev`; 4 orphan `.tmp` files; no pruning | S | LOW | `apps/api/.sprindle-dev/contracts/` listing at audit time (ignored output); `manifest.ts:146-150` renames without cleanup; failed-compile tmp files observed |
| PERF-06 | Server imports manifest, app, and db serially | perf | ~150-300 ms of chained tsx transforms | S | LOW | `apps/api/src/server.ts:13-26` awaits hono import, manifest, create-app, db in sequence; each import measured 600-800 ms cold under tsx |

Direction findings: none. This was a focused perf audit, not a direction pass.

### Status

| Plan | Title | Priority | Depends on | Status |
| --- | --- | --- | --- | --- |
| [005](005-skip-dev-declarations.md) | Skip type declarations for development and test manifests | P1 | None | DONE (manifest.spec 14 pass; auth-manifest 2 pass; test:dev-routes pass ~9.2 s; type-checks + lints exit 0; production build.mjs untouched) |
| [006](006-single-dev-compile.md) | Compile once and wait for watcher readiness on dev startup | P1 | 005 (time saving; logic works alone) | DONE (manifest.spec 15 pass incl. single-compile test; tooling.spec 5 pass; test:dev-routes pass ~10.4 s; type-checks + lints exit 0; pre-existing macOS FSEvents phantom-compile flake documented in 006 deviation note) |
| [007](007-narrow-route-watcher.md) | Narrow the route watcher to routes plus compiled inputs | P2 | None (keep 005/006 signatures if landed) | DONE (manifest.spec 17 pass incl. 2 new scope tests, 10 consecutive full-file passes; tooling.spec 5 pass x2; test:dev-routes pass ~8.4 s; type-checks + lint exit 0) |

Execute 005 → 006, 007 any time after drift check. 005 removes ~2 s per compile; 006 removes 2 compiles.
007 removes spurious recompiles during editing (no startup gain by itself).
Together 005+006 remove ~6-7 s from the ~15 s startup. Either plan alone still helps.

### Findings considered and rejected

- Bundle the dev manifest (PERF-04): deferred; changes reload semantics and
  the auth-manifest source-mode contract. Needs its own design pass.
- Prune contracts and tmp files (PERF-05): housekeeping, not startup time.
  Safe follow-up, unplanned.
- Parallelize server imports (PERF-06): small gain (~150-300 ms), touches
  boot order. Unplanned.
- Database or `defineDomainSchema` as the cause: rejected with evidence;
  first `getDb()` ~1 ms, schema define ~1 ms, pool connect lazy.

## Follow-up plan 004

The user selected the existing temporary-folder approach on 2026-09-10 to get
sibling source imports working quickly. Plan 004 keeps the TypeScript CLI and
maps discovered source and declaration files relative to a common ancestor.
It depends on the completed but uncommitted plan 003 changes.

The virtual-emitter alternative is deferred. The installed TypeScript 7.0.2
public emitter exposes `printNode`; declaration emission through that API was
not proved. The implementation must establish the sibling-import regression
and portable consumer proof before completion. No new compiler architecture,
application configuration, or user generation command is planned.


## Backend generation performance — 2026-09-12

Planned with the improve skill at commit `6fa00d4`. The user selected findings
1, 2, and 4 in that order. This is authorization to write plans, not to execute
them. Finding 3 requires separate explicit permission before further work.
Existing plans 001–007 remain complete; plan 008 is a separate approved E2E
design and is not superseded by these plans.

| Plan | Finding and title | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [009](009-limit-route-declaration-inputs.md) | 1: Limit declaration entry files to route dependencies | P1 | M | None | DONE |
| [010](010-reuse-route-declarations.md) | 2: Reuse valid declarations on unchanged builds | P1 | M | 009 | DONE |
| [011](011-build-route-bundle-once.md) | 4: Build each route bundle once | P2 | M | 010 | DONE (2→1 bundle calls proved by 4 new tests; 53/53 tooling pass; no speedup claimed; approved by the user on 2026-09-12) |

Plan 011 was refined on 2026-09-12 against `a80bfc5` plus the uncommitted
009/010 source. It now gives source fingerprints, two exact helper algorithms,
four named tests, fixed edit points, and repeatable measurement commands. This
 refinement does not resume execution; the pause after plan 010 remains active.


The user authorized delegated execution of 009 → 010 → 011 on 2026-09-12. Plan
009 establishes declaration roots before reuse is added. Plan 010 must include
all type inputs, not only runtime dependencies. Plan 011 comes last by user
priority and changes the same publication path; keep the preceding reuse checks
intact. Completed prerequisite diffs are expected changes during later plans'
drift checks.

Plan 010 uses a TypeScript file-resolution probe and content hashes before it
reuses a declaration. A separate-process test records one declaration emit on
the first build, none on an unchanged second build, and a second emit after a
route edit. The final API measurement recorded a 17.80-second miss and a
4.41-second median for the next four hits, with high host wall-time variance.
Invalid metadata, incomplete inventories, damaged files, and output links that
leave the private directory cause safe misses. The generator, compiler, config,
framework, selected external files, and workspace metadata are part of the key.

A plan 010 review revision fixes recovery when the content-version path is a
dangling symbolic link. The old code failed with `ENOTDIR`. The generator now
uses `lstatSync` to detect the link entry and publishes a valid immutable repair
version while it keeps the old link and backup. The next unchanged process
reuses that repair without another declaration emit. The isolated regression
failed before the fix, and the final tooling suite passed all 49 tests.

The user paused this sequence after plan 010. Plan 011 remains TODO and does not
start until the user asks to resume. Finding 3 still requires separate explicit
permission.

### Audit evidence and limits

Scope: route generation in `apps/api`, `packages/sprindle`, and their command
configuration. The API has 24 routes and 5 scopes. Read-only measurements:

- Route scan: 114 ms first run, 6–9 ms on repeat runs.
- In-memory esbuild analysis: 325 ms first run, 8–10 ms on repeat runs.
- Contextual overlay: 123 files, including 14 test files and 12 scripts;
  preparation took 216 ms first run, 29–34 ms on repeat runs.
- Contextual diagnostics: 2229 ms, zero diagnostics.
- Plain API TypeScript check: 1243 ms compiler-reported total, exit 0.

These are separate stage measurements, not a complete generation benchmark.
The initial measurement command could not resolve `tsx` from the repository
root; the corrected command used the installed API loader and passed. Full
builds, tooling test suites, database tests, and browser tests were not run during
this planning pass. Each plan lists implementation verification gates.
Source files were not changed. Existing Loom work remains outside scope.

Evidence: `packages/sprindle/src/tooling/manifest.ts:123` promotes all overlay
TypeScript files to declaration roots; `language.ts:209` collects the project;
`manifest.ts:70` always emits declarations; `manifest.ts:140` checks the version
after emission; `manifest.ts:60` and `:68` build the same graph twice.

### Deferred and rejected work

- Finding 3: repeated type checks in `apps/api/package.json:15–16`. DEFERRED
  until the user gives explicit permission. No plan was written. Plans 009–011
  must preserve declaration validation, contextual diagnostics, and plain `tsc`.
- Old startup findings: declaration skipping, single initial compile, and
  narrower watchers are already implemented by 005–007. Do not plan them again.
- Runtime-hash-only declaration reuse: rejected because type-only edits can
  change the consumer contract without changing runtime inputs.
- Full compiler replacement, persistent compiler service, broad incremental
  staging, and new cache dependencies: outside the selected scope.
- Route-scan micro-optimization: lower value at the measured 6–9 ms repeat cost.
- Database migration generation, request performance, frontend behavior, and a
  full framework audit were not included. No direction findings were requested.

## E2E iteration speed — 2026-09-12

Design: [008](008-e2e-iteration-design.md). Plans reviewed against `cdbc12b`
with the improve skill on 2026-09-12. Only plans changed during this review.
No E2E timing or implementation test was run. Plans 009–011 are unrelated.

| Plan | Title | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [012](012-e2e-iteration-prepare-once.md) | Prepare once per worker and reuse local servers | P1 | M | None | DONE — unit, guard, iteration, and default gates pass; medians 48.73 s cold, 33.49 s warm prepare, 10.85 s warm skip |
| [013](013-e2e-fast-auth.md) | Reuse API auth state after preparation | P2 | S | 012 DONE with evidence | IMPLEMENTED — combined, repeat, and default proofs pass; equivalent timing incomplete |
| [014](014-e2e-failure-bundle.md) | Preserve failure evidence in one local bundle | P2 | M | None | IMPLEMENTED — failed and green proofs pass; timing incomplete; collector review and 8 Node tests pass |

Recommended order: 012 → 013 → 014. Plan 014 can run independently; retain any
fixture changes already made by 012/013. Use DONE with evidence for dependency
checks. Do not require an undefined VERIFIED status.

Plan 012 measures reset-count savings separately from server reuse and explicit
skip-prepare reuse. Warm servers run in owned terminals, and backend changes
require a compile/restart. Plan 013 creates auth after prepare and stores it in
worker memory. The UI journey keeps a separate session. Plan 014 improves failure
diagnosis, not passing-test speed. It adds bounded missing diagnostics and uses
the existing trace for DOM details.

### Review findings

All findings have HIGH confidence from direct source and plan reads. Effort is
for the plan correction; implementation effort is in the status table above.

| Finding | Category | Impact | Effort | Fix risk | Evidence |
| --- | --- | --- | --- | --- | --- |
| Server reuse needs an external process owner | perf | Separate CLI runs otherwise still pay startup | S | LOW | `apps/web/playwright.config.ts:53–70`; installed Playwright `lib/runner/index.js:836–851` stops processes it starts |
| Prepare-once must be restricted to iteration | correctness | An unconditional module flag removes default per-test isolation | S | MED | `apps/web/e2e/fixtures.ts:48–53`; original 012 step 3 omitted the default branch |
| Auth must follow prepare and remain separate from logout | correctness | Reset deletes cached sessions; global state breaks anonymous/logout cases | S | MED | `apps/api/scripts/reset-e2e.ts:6–31`; `apps/web/e2e/auth.spec.ts:16–25` |
| Report data needs explicit capture and private storage | dx/security | JSON has no network field; raw traces can contain session data | S | MED | installed Playwright `types/testReporter.d.ts:329–359`; `.gitignore:30–32`; `apps/web/e2e/fixtures.ts:48` |
| Prefix helper cannot control API object keys | tech-debt | Unused helper gives a false cleanup contract | S | LOW | `apps/api/src/routes/(authenticated)/files/presigned-url/+server.ts:17–19` |
| Dependencies and proof commands were inconsistent | docs/tests | Executor could update the wrong plan or stop on normal dependency changes | S | LOW | Original 013/014 referred to 009–011 and wrong status rows; `apps/api/package.json:19` focused test also migrates Vitest DB |

### Design details corrected in this review

- Keep design 008's local iteration and full acceptance goals. Explicitly start
  warm servers outside Playwright; `reuseExistingServer` alone cannot retain them.
- Use API storage state in memory after prepare. A setup project and shared disk
  file add reset-order problems without a current need.
- Keep raw bundles in ignored local reports. DOM remains in the native trace;
  standalone console/network summaries require fixture capture.
- Keep the owned-object cleanup rule, but defer its implementation until an
  upload journey exists. The server chooses the actual object key.

### Findings considered and rejected

- More E2E workers: rejected; the suite shares one mutable E2E database.
- Faster prepare on a one-case run from a worker flag alone: rejected; one case
  already prepares once. Measure server startup and explicit state reuse instead.
- New auth setup project or persistent session cache: not needed for the current
  serial read-only RBAC cases. Reconsider only with measured need.
- S3 prefix helper now: rejected; no caller and no API prefix input.
- Failure bundle as a passing-test speed improvement: rejected; measure diagnosis
  usefulness and successful-run overhead separately.

### Review scope and limits

Reviewed the three plans, design 008, their index, E2E config and all current
browser specs, reset/seed/storage guards, auth route contract, related scripts,
package commands, web CI, and installed Playwright report/server behavior.
No source, framework, database, storage, or environment file was changed.
Product modules, a full framework audit, dependency security, and infrastructure
performance were not audited. No new product direction was proposed.

## Symmetric asset fields — 2026-09-12

| Plan | Title | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [015](015-symmetric-asset-fields.md) | Keep asset fields symmetric through read, edit and submit | P1 | M | None | IMPLEMENTED — REWORK revision verified on `sallliisa/improve-carta-module-dev`, independent review still open |

The user selected this migration. Reuse the existing asset schema and adapters;
keep category and other business data in applications. Plan 015 covers file
typing, value preservation, upload readiness and an executable form example.
It is independent of the paused routing and E2E plans above. No source or runtime
check was changed or run during this planning pass. Skill conventions are updated
separately under the user's explicit request; pending framework support is marked.

## Local module environment — 2026-09-12

Plans 016 and 017 remain independent: app ports come from each app environment,
and local setup uses an idempotent file command plus a read-only preflight. The
old implementation and evaluation records for Plans 018–020 were retired by
Plan 073. Git history retains the original records. Current modules are authored
directly from approved designs and plans.

## Form write-schema seam — 2026-09-15

Planned with the improve skill against commit `783ac5d` on 2026-09-15.
Scope: web form schemas that hand-build create/update slots around the Hono
seam. A form used a read/enriched select shape as its base and guessed the
server-owned omit list; type-check, lint, and the API spec passed, and submit
failed silently (issues for fields with no visible input render nowhere:
`packages/loom/src/components/core/Form.vue:177,357`). Plans write new
implementation; no source was changed during planning. Working tree was
stashed first (`stash@{0}`: forward-testing trash + seam proof WIP); the
`document-types` module files it needs live in the stash untracked commit.

| Plan | Title | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [026](026-form-write-schema-seam.md) | Check form write schemas against the Hono wire input in defineEntitySchema | P1 | M | — | DONE — 2026-09-15, dual-shape overloads (bare entity + direct), input-direction + phantom-required checks, 10 type-test cases, type-check + 8 spec tests + lint pass; parent review caught and fixed 4 subagent deviations (see plan) |
| [027](027-migrate-web-schemas-to-seam.md) | Migrate hand-built web schemas onto defineEntitySchema and delete redundant aliases | P1 | S | 026 | SUPERSEDED — 2026-09-15; keep the completed roles migration, but use 029 for all remaining current-tree work; absent document-types/validation-results modules remain absent |
| [028](028-form-orphan-issue-backstop.md) | Make silent Form validation failures impossible (orphan-issue backstop) | P2 | S | 026 | DONE — 2026-09-15, `orphanValidationIssues` in select.ts + dev-throw/prod-toast+alert in Form.vue, 3 new form.spec tests, full loom suite 57 files/450 tests pass, type-check + lint clean; parent verified no other validateDraftAsync callers affected, prod branch review-only (jsdom runs dev branch) |

Historical execution order: 026 → partial 027, then 028 with Loom authority.
Plan 029 supersedes the remaining 027 work. Plan 028 is defense in depth
(runtime visibility net, not the compile-time gate).

### Findings considered and rejected

- Runtime-only Form assert as the primary fix: rejected; the Form submit path
  runs outside all delivery gates (E2E excluded), so it would not be seen
  during development. Kept as plan 028 backstop only.
- Per-module submit specs: rejected; schema shape is proved once at the seam
  type-test, not per module.
- Docs/"remember to omit" comments: rejected; comments do not fail builds.
- API entity changes: rejected; entities already own the correct schemas.

## Unified app resource schema seam — 2026-09-15

Planned with `$improve` against commit `59ba2d1` on 2026-09-15. Scope: make
one Carta web schema seam support Hono and custom resource contracts, migrate
all current app callers, then remove Loom's no-op schema builder.
Planning changed only files under `plans/`. The untracked proof source remains
unchanged for the implementer to fold into permanent tests.

| Plan | Title | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [029](029-centralize-app-resource-schema-seam.md) | Make one app schema seam support Hono and custom resource contracts | P1 | L | — | COMPLETE — 2026-09-15; reviewed and checked |
| [030](030-remove-loom-schema-builder.md) | Remove Loom's schema builder and keep generic resource values | P1 | M | 029 | COMPLETE — 2026-09-15; reviewed and checked |

Execution order: 029 → 030. Plan 029 leaves Loom's old builder only for Loom's
own callers, while the app boundary test prevents web code from using it. Plan
030 removes the builder after the app migration is complete.

### Proof status

The prototype proves the core overload and runtime design: Hono CRUD and
read-only routes, exact record types, required and forbidden write slots,
custom runtime and type-only contracts, parsed-output write compatibility, and
users `{ id }` input without `.passthrough()`. Web type-check and focused lint
passed. The focused test passed with `CHOKIDAR_USEPOLLING=true`; the first
normal run stopped before collection with `EMFILE: too many open files, watch`.
Plan 029 moves this proof into permanent tests and adds inferred-custom,
query, identity, and validator coverage before migration is accepted. The full
repository migration is planned, not yet implemented or proven.

### Findings

| Finding | Category | Impact | Effort | Risk | Confidence | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Web code can bypass the Hono contract through Loom's identity-only builder | correctness / architecture | HIGH | L | MED | HIGH | `apps/web/src/framework/hono/entity.ts`; current Loom imports in web schemas, fixtures, and tests |
| The current Hono write check compares raw Zod input, but Form submits parsed output | correctness | HIGH | M | MED | `apps/web/src/framework/hono/entity.ts:40-56`; `packages/loom/src/components/core/Form.vue:379-381`; passing prototype assertions |
| App callers and old guidance taught two schema paths | DX / tech debt | HIGH | M | LOW | Retired by Plan 073; current skills and app modules use direct contracts |
| Loom's public `defineSchema` is a no-op after the app seam owns adaptation | tech debt / API | MED | M | MED | `packages/loom/src/resources/defineSchema.ts`; `defineResource` already accepts `WebResourceSchemaBoundary` |

### Approaches considered and rejected

- Put Hono support in Loom: rejected. Loom must provide generic resource
  contracts. Carta web owns the transport-provider assumption.
- Keep `defineEntitySchema` or the Loom builder as an alias: rejected. Either
  name leaves a second path that can bypass the current contract.
- Add a separate record-only overload: rejected. Conditional Hono members and
  the explicit custom-contract overload cover read-only resources with the same
  implementation.
- Restore absent `document-types` or `validation-results` files: rejected. They
  are not part of the current tree and this migration must not invent them.

This is a focused migration audit, not a full security, performance, database,
or product-behavior audit. Those areas are outside Plans 029 and 030.

## RPC pit-of-success — 2026-09-19

Planned with `improve` at `2d6b378`. Scope: the `rpc.coffeeSales` 404 plus the
`rpc is unknown` baseline from the same incident. Verified during planning:
with the contract present `rpc.coffeeSales` is TS2339; with
`apps/api/.sprindle` deleted every `rpc` use is TS18046 plus TS2307 on the
contract import. No `rpc.camelCase` dot access exists on the current tree.

| Plan | Title | Priority | Effort | Depends on | Status |
|---|---|---|---|---|---|
| [042](042-gate-type-check-on-route-contract.md) | Gate web type-check on the generated route contract | P1 | S | — | DONE — 2026-09-19, review APPROVE with one test-cleanup revision (unused import removed); self-heal proof passed (deleted `.sprindle` regenerates via `type-check`, exit 0, byte-identical contract) |
| [043](043-windows-safe-contract-links.md) | Make contract staging links Windows-safe | P1 | S | — | DONE — 2026-09-19, review APPROVE (helper plus `vi.mock('node:fs')` recorder test in `manifest.spec.ts`, not `tooling.spec.ts`, since the tooling suite spawns child processes; 37 tooling tests pass, lint and type-check clean) |
| [044](044-reject-unknown-resource-routes.md) | Reject unknown resource routes at the app seam | P2 | S | 042 | DONE — 2026-09-19, review APPROVE as written (fail-fast guard with kebab-case hint, 2 action tests, SDK hyphen positives plus camelCase negative; all suites and lint clean) |

Execute 042 and 043 in any order, then 044. Plan 042 makes the contract
self-healing through the web `type-check` script; 043 makes that build
reliable on Windows (`junction`); 044 adds the fail-fast guard and compiler
negatives.

Considered and rejected: camelCase-to-kebab-case runtime aliases (keeps two
names for one route); a regex lint rule for `rpc.camelCase` (type-check
already rejects it once the contract exists); documenting "remember to
build" (comments do not fail builds).

## List query key types — 2026-09-19

Planned with `improve` at `fd53981`. A forward test wrote
`list({ query: { defaultSort: '-createdAt' } })`; the bare-string type let it
through and it failed only at runtime with
`Unknown sort column "-createdAt"`. This plan types `defaultSort`,
`enumFilters`, and `searchColumns` against the entity, adds the missing
`defaultOrder`, and keeps `pinnedOrder` for mandatory order. No POS module
files change; the forward-test worktree is throwaway.

| Plan | Title | Priority | Effort | Depends on | Status |
|---|---|---|---|---|---|
| [050](050-list-query-key-types.md) | Type list query keys and support default order | P1 | M | — | IMPLEMENTED — 2026-09-19; route-schema 7 pass (4 new type tests), list-policy 7 pass (2 new runtime tests), focused 60 pass, full Sprindle 217 pass (33 files), Sprindle type-check 0, lint 0 warnings/errors, API type-check 0, diff --check 0 |

## Framework pit migration from POS forward-test — 2026-09-19

Planned with `improve` at `b44b82b`. POS work was a forward-test only. These
plans change framework seams plus gates. They do not fix POS module files.
POS routes under `apps/web/src/routes/(authenticated)/pos/` and API orders
under `apps/api/src/routes/(authenticated)/orders/` serve as read-only
fixtures for cases and demo runs.

Intent and nuance: record omission stays legal for truly non-readable rows.
Silent omission was the defect only because POS orders should stay readable
as history. The track keeps runtime hiding silent for users and makes the
author choice explicit at build time. `list` and `create` never gate by row.

| Plan | Title | Priority | Effort | Depends on | Status |
|---|---|---|---|---|---|
| [045](045-display-pit-non-string-fields.md) | Require explicit display for non-string visible fields | P1 | M | — | DONE — reviewed 2026-09-19; helper tightened for enum/selection, mirror agreement test, Loom 477 pass, tool tests pass |
| [046](046-dialogform-composition-guard.md) | Fail fast on empty custom DialogForm composition | P1 | S | — | DONE — reviewed 2026-09-19; dev-only Form guard names schema keys plus missing fields and fromZod, DialogForm forwards unchanged, Loom 482 pass |
| [047](047-derive-record-ops-from-actions.md) | Derive standard record ops from declared resource actions | P1 | M | — | IMPLEMENTED — 2026-09-19; Loom type-check 0, full Loom 488 pass (incl. 6 new derivation specs), web adapter 6 pass, fixed triple removed, web type-check blocked only by pre-existing read-only POS `orders.schema` error (proved identical without this diff); review open |
| [048](048-custom-actions-row-gating.md) | Gate custom record actions by row through declared actions | P1 | M | 047 | IMPLEMENTED — 2026-09-19, revised per review to explicit trailing `{ record }` row context (no global registry; adapter stays standard-only); Loom type-check 0, full Loom 497 pass (incl. 9 new custom row-context specs), web adapter 6 pass, no hard-coded product ops, no POS/API files modified; review open |
| [049](049-row-op-sync-gate.md) | Static gate and docs for row-op sync | P2 | S | 047, 048 | IMPLEMENTED — 2026-09-19; static row-op rule in module-ui-check (review-only) with 6-case tool test, docs/ui/surfaces.md rule, RowOpCoverage type pattern in resource-actions.type-test; tooling 98 pass, Loom type-check 0, full Loom 497 pass; POS demo shows display reviews only (live orders enum covers all declared ops, permission-only resources pass per 047 — plan excerpt drift reported); review open |

Execute 045 and 046 in any order, then 047 → 048 → 049. Plans 047 and 048
touch the shared access path; run them serially. Plan 049 proves the sync
without a browser.

### Findings considered and rejected

- Mandatory `renderer: 'text'` for plain strings: rejected; plain strings keep
  the default. Only non-string kinds require explicit display.
- Runtime logs for hidden View: rejected; hidden controls are normal denial UX.
- Auto-adding `'detail'` whenever permission exists: rejected; some rows are
  deliberately non-readable. The author must decide per status.
- Fixing POS routes inside these plans: rejected; POS is fixture-only by user
  direction. Framework proofs use minimal inline fixtures plus POS demo runs.
