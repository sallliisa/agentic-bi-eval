# Plan 103: Repair app test storage and switch controls

## Status

- Status: DONE — parent APPROVE, 2026-10-14.
- Priority: P1. Effort: S. Risk: LOW. Confidence: HIGH.
- Category: tests and app control integration.
- Planned at: `f507f5e`, 2026-10-14, with the approved uncommitted Plans 099–102 retained.
- Depends on: Plans 099–102 are DONE. This task must preserve their exact source.
- Parent owns planning, orchestration, review, and acceptance. GPT-6 Luna at max reasoning owns implementation.
- No commit, push, install, external write, backend change, or package change is authorized.

## Why this matters

The app unit command has seven failing route tests and three suite import errors.
The route tests still select the old Switch wrapper. The permission page also
contains a local workaround for that obsolete wrapper contract. Node 26 has a
localStorage global that Vitest does not replace with JSDOM storage. Restore
browser storage in test setup and use the supported Switch contract in app code
and tests. Keep every meaningful access, toggle, pending, rollback, and duplicate
request assertion.

## Current state and evidence

The parent reproduced all failures with the five-file focused command below:
5 files failed, 7 tests failed, 1 test passed, and 3 suite import errors.
Evidence: `plans/loom-feedback-evidence/103-parent-baseline.log`.
The earlier full app run is `parent-final-app-unit.log` in that directory.

- `apps/web/vite.config.ts:85` defines JSDOM test environment but has no setupFiles.
- `packages/utilities/src/storage.ts:4` reads `localStorage.getItem`.
- `apps/web/src/stores/colorpreference.ts:8` reads storage during import.
  App.spec.ts, framework/adapters/bundle.spec.ts, and router navigation.spec.ts
  fail through this legitimate browser use. Do not stub their imports or change
  browser production behavior to hide a test environment problem.
- Installed Vitest `dist/chunks/index.DC7d2Pf8.js:242` excludes an existing Node
  global unless it is a designated browser key. Its JSDOM setup at line 528
  publishes `global.jsdom = dom`. It aliases `window` to the test global;
  therefore `window.localStorage` is not a route to the untouched JSDOM object.
  The real storage is `jsdom.window.localStorage`; `vitest/jsdom.d.ts` declares
  that environment object. Use the installed dependency's real object.
- Plan 095 already changed Switch. The current component forwards data-* and
  authored ARIA to its native button and owns role=switch, checked state, disabled
  behavior, and accessible naming. Wrapper class/style remain on BaseInput.
- Role assignment test line 63 selects `[data-role="id"] button`. That attribute
  now belongs to the button itself.
- Permission route lines 33–39 use a directive that queries a child button to
  set ARIA attributes. It no longer reaches a button. Pass the accessible name
  to Switch directly and remove this directive and its obsolete code comment.
- Permission tests lines 143–228 repeat the obsolete descendant selector.
  They must operate on the real button with data-permission and role=switch.

Follow root AGENTS, test-audit, web-ui-surfaces, DESIGN, and the current resource
architecture. DESIGN requires shared controls, accessible names, retained values
on failure, and duplicate prevention. Preserve the existing page layout and
resource/action contracts. Use existing createApp + FrameworkPlugin + real
query-client fixtures in these route tests. Mock only the existing transport
boundaries and feedback outputs; do not mock Switch.

## Scope

Only these project files may change:

- `apps/web/vite.config.ts`
- `apps/web/src/test/setup.ts` (new, test-only browser environment setup)
- `apps/web/src/test/browser-storage.spec.ts` (new, one environment contract owner)
- `apps/web/src/routes/(authenticated)/settings/users/[userId]/detail/role-assignments/role-assignments.route.spec.ts`
- `apps/web/src/routes/(authenticated)/settings/roles/[roleId]/detail/permissions/role-permissions.route.spec.ts`
- `apps/web/src/routes/(authenticated)/settings/roles/[roleId]/detail/permissions/index.route.vue`
- This plan and `plans/README.md`; evidence under `plans/loom-feedback-evidence/103-*`.

Out of scope: all packages, app stores, App.vue, navigation helpers, resource
schemas/declarations, permissions, HTTP actions, dependencies, lockfiles,
framework behavior, broad test cleanup, route generation, and E2E work.
App.spec.ts, bundle.spec.ts, and navigation.spec.ts are verification owners;
they must import and pass without edits. If another defect appears once these
suites can import, report it before expanding source scope.

The parent saved the previous changed-file hashes in
`plans/loom-feedback-evidence/103-existing-work.json.log` and tracked patch in
`103-existing-work.patch.log`. Compare hashes outside this plan's scope at completion.
Do not restore or rewrite approved local work. Leave previous plan history intact.

## Exact implementation contract

1. Configure one app test setup file with a path that remains correct for both
   the Vite root and the scripts' `--root src/` argument. Existing fileURLToPath
   and import.meta.url support a stable absolute path.
2. Bind the test global localStorage and sessionStorage to the environment's
   real JSDOM storage objects before app modules import. Do not use a Map fake,
   persistence file, Node flag, production fallback, or browser-storage polyfill.
   Use installed JSDOM types without any/type assertions or suppression. Keep
   this setup test-only and clear browser storage between cases for isolation.
3. One table-driven test protects local and session browser storage behavior:
   writes through the app global can be read through the actual JSDOM window,
   and changes through that window can be read/removed through the app global.
   Values must be independent literals. Do not compare a value to itself or
   test only object identity. It must fail before the setup fix for the intended
   missing or separate-storage behavior. Existing app import suites prove the
   actual import integration; do not copy their scenarios.
4. The permission route passes `aria-label="Permission <name>"` through Switch's
   supported attributes. Remove DirectiveBinding, switchAttributes, the custom
   directive, and its stale comment. Keep assigned(record), pending map,
   permission checks, model update event, and resource-owned operations unchanged.
   Do not add a local checked-state handler or another control.
5. Route tests select `button[role="switch"][data-role="..."]` or
   `button[role="switch"][data-permission="..."]` directly. Assert name,
   checked state, disabled state, successful writes, rejection restoration, and
   duplicate prevention against these controls. Preserve all existing meaningful
   assertions. Avoid descendant DOM assumptions and broad optional clicks.
6. Use condition-based waits where asynchronous data/write settlement requires
   them. Make each app fixture reliably unmount, remove its host, clear its real
   query client, and reset test resource runtime after each case even on failure.
   No new shared harness or manual runtime registration. Keep cleanup local to
   these existing fixtures. Do not add sleeps to conceal races.
7. No added code comments, broad casts, any, suppression, source-grep tests,
   skipped tests, expected failure markers, compatibility wrappers, or whole-file
   formatting. The source change is app integration of the existing control.

## Commands and steps

Run commands only when source edits are paused. Evidence logs must include exact
commands and exit codes. Required test-audit auxiliary skills/scripts are absent
in this checkout; report that limitation instead of claiming them as run.

1. Read this plan and the named rules. Record git status and drift. Reproduce the
   five-file baseline; confirm the intended missing storage and old selector
   failures before edits.
2. Write the focused table-driven browser-storage regression, prove intended
   failure, then add the setup binding and config. Run browser-storage and the
   three import suites; all pass with no unhandled errors.
3. Remove the permission-page workaround and adapt the two route fixtures and
   assertions to the current button contract. Run all five old owners plus the
   new storage owner; all pass. Count the existing route tests so none disappear.
4. Run the full app unit command and all remaining gates below. All pass.
5. Inspect the incremental diff, verify protected file hashes, and record results
   and files in this plan/index as IMPLEMENTED — parent review pending. The parent
   owns DONE and APPROVE.

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat f507f5e..HEAD -- apps/web/vite.config.ts apps/web/src/test` | Compare live in-scope source; preserve local changes |
| Five old owners | `pnpm --filter @southneuhof/framework-web test:focused -- App.spec.ts framework/adapters/bundle.spec.ts router/__tests__/navigation.spec.ts 'routes/(authenticated)/settings/users/[userId]/detail/role-assignments/role-assignments.route.spec.ts' 'routes/(authenticated)/settings/roles/[roleId]/detail/permissions/role-permissions.route.spec.ts'` | All tests pass; no suite import errors |
| New storage owner | `pnpm --filter @southneuhof/framework-web test:focused -- test/browser-storage.spec.ts` | All table cases pass |
| Full app unit | `pnpm --filter @southneuhof/framework-web test` | Exit 0; all files/tests pass; no unhandled errors |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| App lint | `pnpm --filter @southneuhof/framework-web lint:focused -- vite.config.ts src/test/setup.ts src/test/browser-storage.spec.ts 'src/routes/(authenticated)/settings/users/[userId]/detail/role-assignments/role-assignments.route.spec.ts' 'src/routes/(authenticated)/settings/roles/[roleId]/detail/permissions/role-permissions.route.spec.ts' 'src/routes/(authenticated)/settings/roles/[roleId]/detail/permissions/index.route.vue'` | Exit 0; report warnings |
| Loom unit | `pnpm --filter @southneuhof/loom test` | Exit 0, previous 529 tests retained |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |
| Hygiene | `git diff --check` | Exit 0 |

## Done criteria

All command gates pass. Five old test owners now load and pass; every existing
route scenario is retained. Native switch names and states are verified through
actual app controls. Real JSDOM storage is installed before imports and isolated
between cases. Previous approved work outside scope is byte-for-byte unchanged.
Parent reads the complete incremental diff and independently reruns each gate.
No commit, push, install, backend change, or framework change is made.

## STOP conditions

Stop with the exact observation if a gate fails after two focused correction
attempts, another file must change, a framework defect is found, the real JSDOM
storage cannot be reached as documented, or approved prior work changes.
Do not remove tests or production behavior to achieve a green command.

## Maintenance

Future Switch changes must preserve its public native-control contract. Tests
should query accessible buttons, not wrapper shape. Test environment changes
must preserve browser storage independently from Node's optional storage. This
plan is limited to the reported app baseline failures; no broad audit is claimed.

## Execution record — 2026-10-14

Status is **STOPPED — parent reconciliation required**. The app test repair
passes, but the required app type check still reports errors in files outside
this plan's allowed scope. No file from Plans 099–102 changed.

The test setup binds the app globals to Vitest's real `jsdom.window` storage.
Its path in `vite.config.ts` is absolute and does not depend on Vitest's
`--root src/` argument. The new table test fails before the setup change: the
app global `localStorage` is undefined, and Node's session storage does not
share values with the JSDOM window. It passes after the change. The three
import suites then pass without edits. Permission switches now receive their
accessible names and data attributes through Switch's native attribute bag.
The permission route no longer uses the wrapper directive. Both route test
fixtures select native switch buttons and clean up their app, host, query
client, and resource runtime after each case.

The first app type check found one local Vue attribute typing error plus ten
errors outside the permitted files. The route now uses the supported dynamic
attribute bag, and the focused and full app tests pass again. The second app
type check still reports ten errors in the protected files below. This reaches
the plan's stop condition. I did not edit protected or out-of-scope code.

| Gate | Exact command | Result |
|---|---|---|
| Baseline | `pnpm --filter @southneuhof/framework-web test:focused -- App.spec.ts framework/adapters/bundle.spec.ts router/__tests__/navigation.spec.ts 'routes/(authenticated)/settings/users/[userId]/detail/role-assignments/role-assignments.route.spec.ts' 'routes/(authenticated)/settings/roles/[roleId]/detail/permissions/role-permissions.route.spec.ts'` | Expected baseline failure: 5 files failed, 7 tests failed, 1 route test passed, 3 suites failed during import; exit 1 |
| Storage regression before setup | `pnpm --filter @southneuhof/framework-web test:focused -- test/browser-storage.spec.ts` | Expected red: 2 tests failed because global localStorage was undefined and Node session storage was separate; exit 1 |
| Storage regression after setup | `pnpm --filter @southneuhof/framework-web test:focused -- test/browser-storage.spec.ts` | PASS, 1 file, 2 tests; exit 0 |
| Import suites | `pnpm --filter @southneuhof/framework-web test:focused -- App.spec.ts framework/adapters/bundle.spec.ts router/__tests__/navigation.spec.ts` | PASS, 3 files, 13 tests, no suite import errors; exit 0 |
| Six focused owners | `pnpm --filter @southneuhof/framework-web test:focused -- App.spec.ts framework/adapters/bundle.spec.ts router/__tests__/navigation.spec.ts 'routes/(authenticated)/settings/users/[userId]/detail/role-assignments/role-assignments.route.spec.ts' 'routes/(authenticated)/settings/roles/[roleId]/detail/permissions/role-permissions.route.spec.ts' test/browser-storage.spec.ts` | PASS, 6 files, 23 tests. All 8 existing route tests remain; exit 0 |
| Full app unit | `pnpm --filter @southneuhof/framework-web test` | PASS, 48 files, 245 tests; no unhandled error report; exit 0 |
| App types, first run | `pnpm --filter @southneuhof/framework-web type-check` | FAIL, 11 TypeScript diagnostics: one changed-route attribute error and ten errors outside scope; exit 1 |
| App types, after local fix | `pnpm --filter @southneuhof/framework-web type-check` | FAIL, 10 TypeScript diagnostics remain in protected files; exit 1 |
| App lint | `pnpm --filter @southneuhof/framework-web lint:focused -- vite.config.ts src/test/setup.ts src/test/browser-storage.spec.ts 'src/routes/(authenticated)/settings/users/[userId]/detail/role-assignments/role-assignments.route.spec.ts' 'src/routes/(authenticated)/settings/roles/[roleId]/detail/permissions/role-permissions.route.spec.ts' 'src/routes/(authenticated)/settings/roles/[roleId]/detail/permissions/index.route.vue'` | PASS, 6 files, no warnings; exit 0 |
| Loom unit | `pnpm --filter @southneuhof/loom test` | PASS, 64 files, 529 tests; exit 0 |
| Architecture | `pnpm test:surface-architecture` | PASS, 34 checks; exit 0 |
| Hygiene | `git diff --check` | PASS; exit 0 |

The ten remaining diagnostics are:

- `apps/web/src/framework/__type-tests__/form-renderer-props.type-test.ts`:
  TS2322 at lines 6, 7, and 8 (`string`, `string`, and `number` are not
  assignable to `never`).
- `packages/loom/src/contracts/forms.ts`: TS2456 at line 89 (`FormInput`
  circularly references itself) and TS2315 at line 94 (`FormInput` is not
  generic).
- `packages/loom/src/forms/defineForm.ts`: TS2344 at lines 27, 30, 32, and 35
  (`TRenderer` does not satisfy the `FormRendererComponents` key constraint).
- `packages/loom/src/renderers/formContracts.ts`: TS2456 at line 15
  (`FormRendererKey` circularly references itself).

These files are outside Plan 103's allowed list. The parent must reconcile
these diagnostics against the approved Plans 099–102 baseline before work
continues. Do not treat them as historical baseline errors: the supplied clean
HEAD type-check passed with no diagnostics, but this run changes the approved
local source graph.

### Test-audit authoring gate

| Changed test owner | Observable behavior and credible regression | Why existing coverage was not enough | Production seam |
|---|---|---|---|
| New `browser-storage.spec.ts` table for local and session storage | App-global writes are visible through real JSDOM storage; window writes can be read and removed through the app global. It fails if Node storage is absent or separate. | Import suites failed before exercising app behavior, and no test checked shared storage backing in both directions. | None. It uses Vitest's actual JSDOM object and browser globals. |
| `lists roles and toggles assignment without scope filters` | Native role switches expose their label, checked state, and enabled state and send the expected assignment changes. It fails if data attributes stay on a wrapper or a toggle does not persist. | The old descendant selector failed on the current Switch contract and did not check native button state. | None. The app page, Switch, resource binding, and query client run; only action loading and writes are mocked. |
| Permission cases `shows permissions in one standard list and exposes accessible switches`, `uses PUT and DELETE and keeps the saved state`, `shows the new state and disables the switch while the request is pending`, `keeps the previous state and shows an error when a toggle fails`, `restores the previous state when a pending toggle fails`, and `does not send duplicate requests while a row is pending` | Native permission switches expose names and states, call the correct write, disable while pending, restore after failure, and block duplicate requests. | Existing assertions selected a wrapper descendant that no longer exists, so they could not prove the native control contract. | None. The actual route, Switch, resource binding, and query client run; only RPC responses and toast output are mocked. |

`shows pagination under the role detail` remains in the suite and retains its
pagination assertions. The setup no longer uses arbitrary flush loops for
initial data or write settlement; it waits for rendered buttons and observable
request state. The required test-audit auxiliary skills and scripts are absent
from this checkout: `scripts/run-vitest.mjs`, `scripts/check-changed.mjs`,
`scripts/autoreview.mjs`, `$openclaw-testing`, `$crabbox`, and `$autoreview`.
They were not run or claimed as run.

Evidence is under `plans/loom-feedback-evidence/103-*`. The original approved
work hash file records 42 paths. At final review, all 41 protected paths other
than the allowed `plans/README.md` entry match their recorded hashes. The
README hash differs because this plan's index status was updated.

The focused storage test first used a runtime import of `vitest/jsdom`; Vitest
rejected that import because the package exports the entry for types only. The
test now uses a type-only import and the runtime `jsdom` global provided by
Vitest. The meaningful pre-setup red run is `103-storage-red.log`; it fails in
both cases for the separate or missing storage behavior described above.
`103-drift.log` records the requested `f507f5e..HEAD` command. It is empty
because `HEAD` remains at `f507f5e`; local changes are preserved in the
worktree. `103-protected-work-hashes.log` records the 41/41 protected-file
comparison. `103-unhandled-check.log` records the full app unit log scan.
Raw test and check output is in `103-baseline-reproduction.log`,
`103-storage-red.log`, `103-storage-green.log`, `103-import-suites.log`,
`103-focused-six-owners-final.log`, `103-full-app-unit-final.log`,
`103-app-types.log`, `103-app-types-repeat1.log`, `103-app-lint.log`,
`103-loom-unit.log`, `103-architecture.log`, and `103-diffcheck.log`.


## Parent reconciliation — compiler cache, 2026-10-14

The parent reviewed the complete incremental diff. The new source is within
scope; all protected file hashes still match. The app compiler with
`--incremental false` passes. A compiler run using a fresh build-info path
passes, and a second run with that same new cache also passes. Only the old
ignored `apps/web/tsconfig.vitest.tsbuildinfo` reproduces the ten diagnostics.
This is stale verification state, not a source defect or a new accepted
baseline. Evidence: `103-parent-types-full.log`,
`103-parent-fresh-incremental.log`, and `103-parent-warm-incremental.log`.

The parent moved only the ignored build-info artifact to
`plans/loom-feedback-evidence/103-stale-web.tsbuildinfo.log`, preserving its
contents. The normal app type-check command must now pass twice. No production
or test source change is needed. All original scope protections remain.
The parent will run every final gate and owns final acceptance.


## Final parent review — APPROVE, 2026-10-14

Status: **DONE**. Parent reviewed every incremental source and test change,
checked the new test against the authoring gate, and reran all done criteria.
The app setup uses real JSDOM storage before imports. The permission page uses
Switch's supported native attributes and removes the obsolete directive.
All eight original route scenarios remain. Test fixtures use condition-based
waits and reliable cleanup. No source scope change was needed.

| Parent gate | Result | Evidence under `plans/loom-feedback-evidence/` |
|---|---|---|
| Six focused owners | PASS: 6 files, 23 tests | `103-parent-final-focused.log` |
| Storage owner | PASS: 1 file, 2 table cases | `103-parent-final-storage.log` |
| Full app unit | PASS: 48 files, 245 tests, no unhandled errors | `103-parent-final-app-unit.log` |
| Normal app types, fresh cache | PASS: exit 0 | `103-parent-normal-types-first.log` |
| Normal app types, reused fresh cache | PASS: exit 0 | `103-parent-normal-types-second.log` |
| App focused lint | PASS: 6 files, no warnings | `103-parent-final-lint.log` |
| Full Loom unit | PASS: 64 files, 529 tests | `103-parent-final-loom-unit.log` |
| Surface architecture | PASS: 34 checks | `103-parent-final-architecture.log` |
| Diff hygiene, added-comment scan, scope and protected hashes | PASS: all 41 prior-work files unchanged | Parent checked the current diff and snapshot |

The stale ignored compiler cache was preserved as an ignored evidence log and
regenerated. Fresh and reused cache checks pass; no compiler error is accepted
as a baseline. Storage's intended pre-fix regression has two failing cases in
`103-storage-red.log`. The original seven failing tests and three import
failures reproduced in `103-parent-baseline.log`; all are fixed now.

The parent wrote the plan, delegated implementation to GPT-6 Luna at max
reasoning, handled the cache reconciliation, and owns this approval. Luna wrote
all source and test changes. No comments, test skips, weakened assertions,
framework modifications, package changes, install, commit, push, or external
write were added. The auxiliary test-audit commands remain unavailable and
were not claimed as run. Earlier STOPPED records describe prior verification;
this verdict is the final status.


Evidence housekeeping: the snapshot hash JSON, tracked-diff patch, and stale
build-info artifact now have `.log` suffixes so they remain ignored verification
artifacts. The final hash check resolves the renamed patch and still matches
41/41 protected entries: 40 prior source/plan files and the captured patch.
Only the allowed plan index changed. No evidence content was lost.
