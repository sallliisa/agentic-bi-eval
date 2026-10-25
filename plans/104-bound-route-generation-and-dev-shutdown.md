# Plan 104: Bound route generation and development shutdown

## Status

- Priority: P1
- Effort: L
- Risk: MED
- Depends on: none; retain completed Plans 082, 083, and 087–089
- Category: bug
- Planned at: commit `e1a9b1c`, 2026-10-25
- Status: DONE — parent APPROVE, 2026-10-25

## Intent and evidence

A user found watcher PID 37094 (`node --import tsx scripts/dev.ts`) holding
`apps/api/.sprindle/generation.lock`. Its API child still served an old
manifest. POST `/public/reports/create` returned 404 while the old
`/public/reports` returned a validation error. After restart, these results
reversed. Both processes were sleeping with 0% CPU at inspection. SIGTERM
stopped the API child but did not stop the watcher. SIGKILL of the watcher,
then normal startup, recovered generation without manual lock deletion.
A separate API type check had timed out waiting for the same lock.

The precise blocked operation is unknown. No stack sample, complete process
tree, or reproducible source change remains. Do not claim to have proved the
incident's original cause. Reproduce a controlled blocked operation through
the actual generation path to prove the recovery contract instead.

The result must let the development watcher detect and stop a blocked
generation task, report the failure, and compile later valid source. Shutdown
must finish within a set time. A live unrelated lock owner must remain safe.

## Current state and conventions

- `packages/sprindle/src/tooling/source.ts:61`: `withRouteGenerationLock`
  owns the `.sprindle/generation.lock` directory. Its owner contains PID and
  token. The acquisition deadline is 120 seconds. It reclaims a valid owner
  record only when that PID has exited. Preserve this safety property.
- `packages/sprindle/src/tooling/source.ts:110` returns `await operation()`
  inside `try/finally`. No operation deadline exists.
- `packages/sprindle/src/tooling/manifest.ts:147`:
  `return withRouteGenerationLock(projectRoot, () => compileRouteManifestLocked(projectRoot, routesDirectory, output, bundle))`.
- `packages/sprindle/src/tooling/manifest.ts:13` has a process-local
  `dependencyInputs` map. `compileRouteManifestLocked` updates this map both
  before the bundler and after runtime resolution. The watcher needs these
  inputs even when a later compilation step reports an error.
- `packages/sprindle/src/tooling/manifest.ts:344` serializes watcher work in
  `queue`. Its `close` sets `closed`, closes filesystem watchers, then
  `await queue`. It cannot stop pending compiler work.
- `packages/sprindle/src/tooling/resolution.ts:395` starts a Node runtime
  resolution probe. The `spawnSync` call has no timeout. Source mode adds
  `--import tsx`. A synchronous wait can prevent JavaScript signal handling.
  The TypeScript 7 resolver also uses a native synchronous API. A timer in
  that same process cannot stop either synchronous operation.
- `packages/sprindle/tooling/dev.mjs:5` awaits watcher initialization before
  installing signal handlers. Startup cancellation must be supported too.
- `packages/sprindle/tooling/package.mjs` builds separate executable entries
  in `dist-tooling`. Package exports use that compiled output. A new child
  entry must work from source tests and the installed package.
- `apps/api/scripts/dev.ts:120` waits for watcher close, server close,
  initialization, and restart work. Its `stopServer` waits without a deadline.
- `apps/api/scripts/dev-launcher.mjs:203` and `:276` also wait for their
  owned worker without a deadline. Its preparation process already uses
  process-group termination with grace and forced-stop limits. Match that
  ownership pattern; do not kill processes found only by port or lock PID.
- Tests use Vitest fixtures, real child processes, temporary roots, and
  explicit cleanup. See `src/tooling/tooling.spec.ts:11,59` and the real
  workspace fixture in `apps/api/scripts/dev-launcher.test.mjs:30`.
- Use existing TypeScript ESM conventions and existing dependencies. Add no
  code comments, compatibility aliases, or test-only production exports.
- `CONTEXT.md` defines a route as the HTTP entry for an operation. This plan
  changes tooling lifecycle only. It changes no business route contract.

## Scope

Allowed source and test changes:

- `packages/sprindle/src/tooling/manifest.ts`
- `packages/sprindle/src/tooling/source.ts` only for ownership/cleanup needed here
- `packages/sprindle/src/tooling/resolution.ts`
- New private generation process support under `packages/sprindle/src/tooling/`
- `packages/sprindle/src/tooling/index.ts` only if public option types need export
- `packages/sprindle/tooling/package.mjs`
- `packages/sprindle/tooling/package-state.mjs` only if worker delivery needs it
- `packages/sprindle/tooling/dev.mjs`
- `packages/sprindle/src/tooling/manifest.spec.ts`, `tooling.spec.ts`, and a new
  focused process lifecycle spec in that directory if needed
- `apps/api/scripts/dev.ts`, `dev-launcher.mjs`, `dev-launcher.test.mjs`
- A new API development lifecycle proof under `apps/api/scripts/` if the
  existing launcher fixture cannot express the required real process boundary
- This plan and the Plan 104 section of `plans/README.md`

Do not change business routes, database/storage state, application modules,
Loom, SDK, web UI, dependencies, lockfiles, unrelated plans, or `AGENTS.md`.
The starting worktree has a user change in `AGENTS.md`; preserve it exactly.
Do not commit, push, publish, install dependencies, or update framework sources
from upstream. The user explicitly authorizes the Sprindle changes in this fix.

## Commands

Run from the repository root unless a command supplies a directory.

| Purpose | Command | Expected result |
| --- | --- | --- |
| Drift | `git diff --stat e1a9b1c..HEAD -- packages/sprindle apps/api/scripts` | No source drift, or reconcile the cited code before edits |
| Package and types | `pnpm --filter @southneuhof/sprindle type-check` | Exit 0; produces current compiled tools/types |
| Focused process proof | `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/tooling.spec.ts src/tooling/manifest.spec.ts` | All pass |
| Tooling suite | `pnpm --filter @southneuhof/sprindle test:tooling` | All pass, including any new lifecycle spec |
| Sprindle suite | `pnpm --filter @southneuhof/sprindle test` | All pass |
| Launcher boundary | `node --test apps/api/scripts/dev-launcher.test.mjs` | All pass |
| API types | `pnpm --filter @southneuhof/api type-check` | Exit 0 |
| Framework lint | `pnpm --filter @southneuhof/sprindle lint` | Exit 0 |
| API lint | `pnpm --filter @southneuhof/api lint` | Exit 0 |
| Diff | `git diff --check` | Exit 0 |

If a new standalone Node proof is needed, record its exact `node --test`
command and result in this plan. Do not run API database tests or migrations
for a process-only change. CI includes Windows tooling and macOS watcher
jobs. State which platforms were actually exercised locally.

## Implementation steps

### 1. Establish a failing process-level proof

Read the full relevant tests and their production owners. Apply `test-audit`
and record the behavior, credible regression, coverage gap, and choice of
boundary for each new test. Existing stale-owner tests cover dead PIDs, not a
live generator that cannot finish. Existing reload proofs cover valid and
invalid source, not blocked compiler work.

Use a fixture-local preload or controlled dependency process to block an
actual compiler/resolver operation after lock acquisition. Use a marker or
IPC handshake to prove the blocking point was reached; do not infer it from
a sleep. Exercise the real watcher/CLI with an outer test cleanup deadline.
No production hang flags or exported test hooks are allowed.

Verify the original code fails to finish SIGTERM shutdown or recover from
the injected block. Save the exact command, failure, and cleanup result in
the execution record. Verify failure is due to the intended wait, not a
missing dependency or invalid fixture. Keep this fixture as the regression.

### 2. Give watcher compilation an owned process boundary

Move watcher compilation into a private child process which owns its own
generation lock. Keep `compileRouteManifest` direct calls and output contract
valid. Do not recursively spawn generation children from the child entry.
Use a small typed request/result protocol with project root, routes path,
output path, bundle mode, error details, and dependency inputs as needed.
Transfer dependency input updates on failure as well as success so existing
external-input watching and `hasInput` behavior remain correct.

The parent must remain responsive during synchronous compiler/probe work.
Set a finite generation deadline, default 120 seconds. If a configurable
timeout is needed, expose one validated production option, not a test-only
switch. Preserve the existing positional watcher calls. Add an optional
AbortSignal where needed for real startup cancellation by API and CLI callers.

On timeout or close, stop only this watcher's owned generation process tree.
Use a short graceful-stop interval, then force stop. Confirm process exit
before allowing another generation. On POSIX, use an owned detached process
group for compiler descendants. On Windows, use an equivalent bounded owned
tree stop. Handle child startup error, exit without a result, IPC disconnect,
and a parent disconnect. Ensure a child cannot remain orphaned and later
publish after its parent stops.

Do not steal a lock based on age or heartbeat alone. If forced termination
leaves a lock, let the existing dead-owner recovery reclaim it only after
the generator exits. Do not terminate an unrelated lock owner.

Make source execution and compiled/packed execution work. Deliver the private
worker entry through the existing package build and freshness mechanism.
Check it from an installed-package fixture, not only a source import.

Verify package/type checking and the focused process proof. The watcher must
remain alive after a generation timeout, report an actionable timeout error
with output/project context, then publish a corrected route on a later edit.
Keep the last complete manifest during a failure; do not report success for it.
Avoid automatic unbounded retries. Preserve serialized generation and the
existing success/error callback contract.

### 3. Bound the runtime resolution probe

Add a finite hard deadline to the real probe in `resolveRuntimeEdges`. It
must kill a probe that ignores graceful signals. An asynchronous probe is
acceptable if it reduces lifecycle complexity; use the smallest solution
consistent with ownership and cancellation above. Include importer/project
context and timeout details in errors. Preserve stdout parsing, resolution
semantics, and buffer bounds. A Promise race around synchronous work is not
a timeout. Do not change TypeScript or tsx resolution contracts.

Verify focused resolver/manifest tests, including both source and bundle
modes. If the process boundary already gives a strict lifetime to all probe
calls in scope, explain why a second probe timer is or is not needed for
direct batch compiler callers. Direct calls must not wait forever on this
known external process wait.

### 4. Complete bounded API and CLI shutdown

Install CLI signal handlers before initial compilation. Pass real startup
cancellation into the watcher. In `apps/api/scripts/dev.ts`, abort generation
before waiting for initialization or watcher close. Prevent queued work or
late completion callbacks from restarting a server after stopping begins.

Bound API server shutdown and launcher-owned worker shutdown. Send the normal
signal first and force-stop only owned children after a short grace period.
Use explicit upper limits: owned server/worker shutdown should complete within
five seconds in the controlled fixture; watcher close should complete within
five seconds after cancellation. Do not turn an incomplete cleanup into a
success result. Retain conventional exit status for SIGINT/SIGTERM.

Verify the launcher boundary suite and lifecycle regressions. Include SIGTERM
during initial compilation, SIGTERM after a route edit blocks generation,
and an owned API child that ignores SIGTERM. Prove the parent exits and its
owned children exit; port closure alone does not prove generator cleanup.

### 5. Validate and prepare for parent review

Run the command table. Read the complete diff and remove unused protocol
fields, duplicated helpers, test-only seams, and added code comments. Update
only the Plan 104 index row with implementation status, evidence, and remaining
limits. Leave final DONE acceptance to the parent reviewer.

## Test contract and done criteria

- [ ] A real blocked generation regression fails on the original code and
  passes with the fix. Its handshake proves lock ownership before cancellation.
- [ ] A timeout stops the generator and descendants before a subsequent
  generation acquires the lock. A later route move changes the manifest from
  `/public/reports` to `/public/reports/create` (or equivalent fixture paths).
- [ ] An unrelated live owner retains its lock; no time-based live lock theft.
- [ ] SIGTERM during startup and during reload completes within the stated
  bound; no late publication/restart or surviving owned process remains.
- [ ] The installed-package watcher can locate and run its private child.
- [ ] Existing external dependency, source-mode, invalid-source recovery,
  concurrent generator, and atomic publication tests still pass.
- [ ] All command-table gates pass, or the exact failure and its baseline are
  reported. No claim of full verification if a gate is blocked.
- [ ] `git diff --check` passes; only allowed files changed, plus unchanged
  pre-existing `AGENTS.md` work.
- [ ] Execution evidence records commands, results, platform, code versus
  test/support LOC, deviations, and the unverified incident cause.

## Stop conditions

Stop and report if safe termination requires killing an unrelated process,
lock reclamation while its owner is alive, a business route/storage change,
or a file outside scope. Report a mismatched drift excerpt before adapting
the plan. If a required gate still fails after two focused repair attempts,
report the exact obstacle rather than suppressing the check. Do not expand
into framework preparation redesign or dependency upgrades.

## Maintenance and review notes

The compiler, its Node probe, and esbuild may spawn child processes. A future
compiler change must retain owned-tree cleanup. Dependency input transfer is
part of watcher correctness, not optional telemetry. Process packaging must
be checked when tool entries change. Process death during publication can
still interrupt the existing two-file pointer update; preserve immutable
source versions and existing rollback behavior, and report any new race.
Do not promise recovery from OS-level uninterruptible I/O or reconstruct the
original incident from timestamps alone.

## Execution record

Implementation is complete and parent review is approved. The incident's
original blocked operation remains unknown. The records below retain the
initial implementation and revision results; final acceptance is recorded last.

The test audit used the observable watcher contract: stop an owned generation
that blocks in runtime resolution or synchronous worker code, preserve
unrelated live lock ownership, and publish a later corrected route. Existing
coverage did not block a real resolver or generator after lock acquisition.
The resolver proof uses a real watcher process and fixture-local preload
handshake. The lock owner PID matches the blocked resolver's parent PID. It
uses no production test hook.

The pre-fix regression command was:

```text
pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/generation-process.spec.ts
```

The original implementation failed because the watcher did not stop within five
seconds after SIGTERM; the test reported `watcher did not stop within 5 seconds
after SIGTERM (5006 ms). READY`. The preload marker proved the real runtime
probe was blocked after the watcher acquired the generation lock. Test cleanup
force-stopped the watcher, generator, and probe, then verified that all owned
PIDs exited. It did not remove the lock by hand.

The watcher now runs generation in a detached owned process group on POSIX and
uses a bounded owned-tree stop on Windows. Its default generation deadline is
120 seconds. It transfers dependency inputs on success and failure. Direct
runtime probes are asynchronous, have a 30-second deadline, and support
cancellation. Startup and shutdown paths pass cancellation through the CLI and
API. API server and launcher worker shutdown have bounded graceful and forced
stops. Existing live-lock ownership rules remain unchanged.

Source-mode workers run with Node's native TypeScript type stripping. The
fixture projects do not have `tsx` installed, and the worker only uses erasable
TypeScript syntax. This changes worker loading only; route runtime resolution
still uses the existing `tsx` path. Carta API supports Node 24 or later. The
installed-package test exercises the compiled worker entry. On Windows, Node's
SIGTERM is forceful for one process, so owned trees use `taskkill /T /F` directly
to stop descendants with the worker. This path was not exercised locally.

Initial implementation verification before parent review round 1 on macOS
(Darwin), Node v26.9.0:

| Command | Result |
|---|---|
| `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/tooling.spec.ts src/tooling/manifest.spec.ts src/tooling/generation-process.spec.ts` | PASS, 3 files, 51 tests |
| `pnpm --filter @southneuhof/sprindle test:tooling` | PASS, 7 files, 74 tests |
| `pnpm --filter @southneuhof/sprindle test` | PASS, 36 files, 234 tests |
| `node --test apps/api/scripts/dev-launcher.test.mjs` | PASS, 8 tests |
| `pnpm --filter @southneuhof/sprindle type-check` | PASS |
| `pnpm --filter @southneuhof/api type-check` | PASS |
| `pnpm --filter @southneuhof/sprindle lint` | PASS |
| `pnpm --filter @southneuhof/api lint` | PASS |
| `git diff --check` | PASS |

During implementation, the external-cycle watcher test first exposed that a
source worker could not resolve `tsx` from a minimal temporary project. Native
TypeScript stripping fixed the worker load. One later tooling run also failed
when the test's 3-second deadline expired during initial compilation under suite
load; the fixture deadline is now 12 seconds. The focused test and both full
Sprindle suites then passed. The first package lint found an unused import and
an empty catch block; both were corrected before final lint.

The test-audit skill refers to `scripts/run-vitest.mjs` and
`scripts/check-changed.mjs`, which are not present in this repository. Its
`$autoreview` tool is not available in this session. No replacement scripts or
dependencies were added; direct Vitest commands and the repository's own test
commands ran instead. Windows and Linux were not exercised locally.

Changed production code and support total 674 added and 89 removed lines.
Tests and test support total 399 added and 5 removed lines. These counts exclude
plan text and the pre-existing user change in `AGENTS.md`; its SHA-256 remains
`9114fd4529da48fe6d6f3e65803d1c6719e00ed3f5b4b0dbbd55a69baedec33c`.

Remaining limits: the original incident cause is unverified. The forced-stop
contract cannot promise recovery from OS-level uninterruptible I/O. Direct
compiler calls can stop a blocked Node runtime probe, but the caller cannot
interrupt synchronous TypeScript compiler work in its own process. Windows taskkill behavior remains unverified locally.

### Parent review round 1

The new synchronous-worker regression blocks in a fixture-local preload after
the generation worker owns `.sprindle/generation.lock`. The marker records the
worker PID and lock owner PID and waits for them to match. It also starts one
child process before the preload enters `Atomics.wait`. The test kills the real
watcher with SIGKILL, checks that its supervisor, generation worker, and child
process exit within five seconds, checks that the previous route pointer stays
unchanged, then calls the direct compiler to reclaim the stale lock and publish
`/public/reports/create`. The test has no production hang option or export.

The pre-fix command was:

```text
pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/generation-process.spec.ts -t 'watcher disconnect stops a synchronous generation owner and its descendants'
```

It failed with exit 1 for the intended reason after the watcher exited:
`Timed out waiting for the blocked generation owner and descendant to exit.
generator 31257 alive=true; descendant 31260 alive=true`. Cleanup then force-stopped
the owned processes. The owner marker proved that the blocked worker held the
lock before the watcher was killed. The first draft of the fixture checked for
the lock before the worker could acquire it; polling the owner file fixed that
handshake before this red proof.

The watcher now forks a private supervisor that remains responsive while the
generation worker performs synchronous TypeScript work. The supervisor owns a
detached POSIX process group with the lock-owning worker and its descendants.
When watcher IPC closes, the supervisor terminates that owned group. On
Windows it uses `taskkill /T /F` for the supervisor tree, with a worker-tree
fallback. The parent watcher also terminates only the supervisor it created.
It never signals the PID in an unrelated lock record. The new supervisor entry
is part of the existing package build, and the installed-package tooling test
passes. Unused child stdout is ignored. Process cleanup now waits for child
stdio streams to close or for the explicit `close` event, and the process-group
check still confirms descendant exit before another generation can start.

Revision verification on macOS (Darwin), Node v26.9.0:

| Command | Result |
|---|---|
| `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/generation-process.spec.ts -t 'watcher disconnect stops a synchronous generation owner and its descendants'` | PASS, 1 test; 4 skipped by filter |
| `pnpm --filter @southneuhof/sprindle test:tooling` | PASS, 7 files, 75 tests |
| `node --test apps/api/scripts/dev-launcher.test.mjs` | PASS, 8 tests |
| `pnpm --filter @southneuhof/sprindle type-check` | PASS |
| `pnpm --filter @southneuhof/api type-check` | PASS |
| `pnpm --filter @southneuhof/sprindle lint` | PASS |
| `pnpm --filter @southneuhof/api lint` | PASS |
| `git diff --check` | PASS |

An intermediate type check reported TS18048 because a `stdio` entry can be
undefined. The close check now treats absent streams as closed and still waits
when any stream remains open; the final type-check passed. The complete
Sprindle suite was not rerun in this revision because the changes affect only
tooling and lifecycle code; its tooling suite and the launcher boundary suite
were rerun. No final check is failed or blocked. Linux and Windows were not
exercised locally; the Windows tree-stop path remains unverified. The original
incident's blocked operation remains unknown.

## Parent acceptance — 2026-10-25

Verdict: APPROVE. The parent read the changed code and tests and requested two
focused revisions. The first added an independent supervisor for watcher death
during synchronous compiler work, ignored unused stdout, and made process
cleanup wait for stream closure. The second removed one assertion that only
checked text written by its fixture. The recovered manifest path and executed
route handler assertions remain.

The parent independently reran these gates on the final production code:

| Command | Result |
|---|---|
| `pnpm --filter @southneuhof/sprindle type-check` | PASS |
| `pnpm --filter @southneuhof/api type-check` | PASS |
| `pnpm --filter @southneuhof/sprindle lint` | PASS |
| `pnpm --filter @southneuhof/api lint` | PASS |
| `pnpm --filter @southneuhof/sprindle test` | PASS, 36 files, 235 tests |
| `node --test apps/api/scripts/dev-launcher.test.mjs` | PASS, 8 tests |
| `git diff --check` | PASS |

After the test-only assertion removal, Luna reran the parent-disconnect
regression: PASS, one test with four skipped by its name filter. No production
code changed after the full parent checks. Full test output included expected
error-path logs; the recorded command exit status was zero.

Scope review found only allowed files and the unchanged pre-existing
`AGENTS.md` work. Its SHA-256 still matches the recorded value. No commit,
push, dependency installation, database migration, or upstream update was
performed. Local verification was on macOS with Node v26.9.0. Windows and
Linux are unverified locally. The unavailable test-audit helper scripts and
autoreview tool remain reported above; parent code review and repository
checks were completed instead.

All executable done criteria passed. These checks prove bounded recovery from
controlled blocked compiler work and safe lock recovery. They do not establish
the blocked operation in the original incident. Direct synchronous compiler
calls outside the watcher retain the limitation recorded above.

## CI follow-up — 2026-10-25

The user authorized repair of PR 8 CI failures and merge after checks pass.
The backend, Windows tooling, macOS watcher, and TypeScript jobs passed on the
initial PR. Web validation failed five of eight route-contract proofs after
pnpm installed dependencies in a temporary fixture. The install removed manual
fixture package links, so the tests failed on unresolved imports before they
could check the intended import-agreement contract.

The fixture now sets `verifyDepsBeforeRun: false` in its own temporary workspace
configuration. It reuses the already installed dependencies and no longer
copies pnpm's private install-state files. The real workspace configuration and
production guard are unchanged. All existing test assertions remain intact.

The original CI command and logs provide the failing evidence. Local runs did
not reproduce the automatic reinstall, including Node 24 with `CI=true`.
With the fixture repair, the complete route-contract suite passed locally on
Node 24: eight tests. Focused web lint and `git diff --check` also passed.
Updated CI must pass before merge; local success does not replace that gate.

The first updated CI run confirmed that automatic installation was disabled,
then exposed a second setup error: copied API workspace links still targeted
the source checkout. On a clean runner that checkout has no Sprindle build
output, while `tooling:ensure` builds the fixture's separate Sprindle copy.
The fixture now points its API Sprindle link at that copy and excludes generated
tool/type output when copying source. This makes the tests build and use their
own tools. All eight contract tests pass locally on Node 24 with this clean
fixture, and focused lint and diff checks pass. CI validation remains required.

### Stopped at the user's checkpoint — 2026-10-25

The route-contract proofs pass in CI at `99dc404`. Later web validation exposed
two existing browser assertions that required slot array identity. Form slots
now return readonly snapshots, so a fresh array does not mean the draft changed.
The focused browser command reproduced both failures locally.

The local test correction uses a distinct selected owner through the real
setter, checks that the other three forms retain their values, checks that
default factories do not rerun, and checks the distinct submitted records.
It removes ineffective attempts to mutate frozen snapshots. No form production
code changed. The focused cases pass, and the full Loom browser suite passes:
17 files, 87 tests. A matching Chromium browser was downloaded for local proof.

The user requested a stop before further work. Save this correction as a local
commit and leave PR 8 open. The browser correction has not been pushed. Next:
review and push the checkpoint, confirm all PR checks pass, then merge only
after the user resumes the task. The earlier fixture fixes are already pushed.
