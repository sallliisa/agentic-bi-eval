# Delivery plan: Simple test runner

Design: [design.md](design.md)

## 1. Work order

- [x] Reset source to verified Carta baseline 16e96c1 and remove discarded files.
- [x] Remove only discarded feature tables, permissions, and migration history from configured app databases; keep Carta baseline data.
- [x] Implement set-owned case CRUD, basic comparison, and minimal Cloudflare OS execution.
- [x] Implement standard set/case pages and result dialogs.
- [x] Apply the new application migration and permission seed; verify without browser tests.
- [x] Replace manual case position form inputs with full-list drag ordering and a scoped reorder operation.

## 2. Technical notes and blockers

- The user explicitly authorized hard reset and discarding the old feature.
  The source reset and git clean completed; ignored local environment values
  were retained. Scoped cleanup of known old runner tables, migration rows,
  and permission codes is complete in both app databases. The baseline
  migrations and Carta identity tables remain in place. No operational database
  was changed.
- Both Carta targets connect directly to gamingmachine at 10.8.69.67:55432,
  using separate development and test database names. WireGuard is required.
  No SSH tunnel or local substitute is part of setup.
- Reuse Carta authentication, operation permissions, supported Views and
  inputs. Change application code only. No framework package work is approved.
- Do not recover or copy discarded feature code from Git or old proof files.
  The thesis source is only a reference for the Cloudflare OS API protocol.
- Select sufficient proof with verify-carta-module and test-audit. Focus on
  actual route persistence, parent scope, exact prompt transmission, simple
  comparison, and immutable saved results. Keep proof small. Browser tests
  remain disabled; no model or operational-data changes are needed for CRUD.

## 3. Delivery record

- Removed only the known runner tables and feature migration rows from Carta
  development and guarded test databases. Kept the two baseline migrations and
  identity tables.
- Added one additive migration for the four runner tables and seeded the
  authorization catalog and administrator role in both Carta databases.
- Focused API proof passed: six tests cover text/JSON comparison, case scope,
  ordered prompt execution, and saved result inputs. API, SDK route-contract,
  and web type checks passed. Focused lints passed. The run detail has a manual
  refresh action for status and results. Cloudflare OS login and one bounded
  chat check passed.
- API and web preview services respond at ports 5182 and 5183.
- Case-order update: removed execution position from case forms and displays.
  The standard ListView drag event saves the complete unfiltered case order
  through an atomic, set-scoped API operation. Search and view-only access
  disable dragging. New cases append after the last position. The API route test
  passed for saved order, append behavior, permission denial, and unchanged
  order after duplicate, missing, or foreign IDs. No schema migration was
  needed.
- Case-order proof passed: focused API routes (2 tests), API type check, SDK
  route-contract check, web type check, focused API and web lint, route compile,
  and `git diff --check`. The first web type check caught missing guarded-action
  arguments and the first web lint caught formatting; both were corrected and
  passed on rerun. Browser proof remains disabled by user instruction. Logs are
  in `.local/verification/simple-test-runner-case-drag-20261027/`.

## Result retry and icon actions

Added a permission-gated per-result retry endpoint and icon action. A retry
uses the saved inputs in a fresh chat and replaces that result's attempt
fields. The run must be idle; an atomic status update rejects concurrent
attempts. Other result rows remain unchanged. The view action now uses an eye
icon with an accessible label. The existing Refresh action loads completion.

The real route-flow test now checks a failed case becoming PASS, preserved
saved inputs after source edits, a new chat reference, unchanged sibling
results, local access denial, wrong-run scope and duplicate rejection. Seven
focused tests passed. API type check and focused API/web lint passed; the web
lint retains two standard-control review warnings for the requested icon
actions. Initial check failures from unsupported Promise.withResolvers in the
test target and Vue formatting were corrected. No model or browser calls were
used for these checks.

## Configurable repeated runs

- [x] Open run setup from the set Run action with optional name, model selection, and repetition count.
- [x] Save the run name, model ID, repetition count, and each repeated case result.
- [x] Group repeated results by case, show pass count over repetitions, and expose each saved response and retry in case detail.
- [x] Add the schema migration and apply it to the configured development database `carta`.
- [x] Pass API and web type checks and lint.
- [ ] Run the focused route proof for repeated execution, selected model, and case pass counts.

The model list uses the Cloudflare OS workspace API. Existing runs backfill the
set name and one repetition; the model ID remains unknown for those runs. No
repetition upper limit is set. Runtime route proof remains unverified.

## Global run refresh

The run detail's existing Refresh control now confirms and reruns every saved
repetition in place for users with execution access. It reuses the saved model,
prompts, and expected results, clears and replaces all attempt outputs, and
reloads the run until execution ends. View-only users retain a read-only data
refresh. A new permission-gated route uses the run status to reject overlapping
retry work. No database migration is required.

API and web type checks and focused lints pass. The API route returns an
authorization rejection without a session. A live run refresh is now active in
the Carta page. At the latest read, the run status was running, T1-C1 was 3/3,
and the other cases were still pending. No second run was started.

## Error retries and run management

The run detail has a Retry errors action. It selects only result rows with a
saved execution error and uses the run's repetition count as the batch size.
Comparison failures and successful results stay unchanged. The API rejects
active runs and rolls back the claim when there are no errors.

The Test Runs list has Edit and Delete actions for users with execution access.
The edit form and API accept only a non-blank name. Delete confirms the run
name and removal of its saved results. The server atomically rejects deletion
of an active run. The list uses its guarded delete callback and handles saved
writes separately from refresh failures. No database migration is required.

The real route/database proof passed all four retained tests. It covers a PASS,
a comparison FAIL, an execution error, selective retry, unchanged sibling
results, access denial, active-run deletion rejection, strict name updates,
no-error rollback, and deletion with result cascade. A temporary verdict-only
filter failed this proof as expected; the error-only filter was restored and
the complete focused suite passed. The external model service was mocked at
its existing runner boundary.

API, SDK, and web type checks and focused lint checks passed. Web lint reports
two standard-control review warnings: the existing result view icon and the
run delete control. The delete slot is local so its confirmation can name the
run and state that saved results are removed. Both use shared controls. The
source review checks action permissions, guarded deletion, form loading,
route targets, result refresh, and post-write feedback. Browser and live model
execution were not verified. Browser tests remain disabled by the existing
feature instruction. Evidence is in `.local/verification/test-run-actions/`.

## Stop an active run

Added a Stop run action beside Retry errors. It uses execution access and
applies only to the selected run owned by the current API process. Each
execution owns an AbortController. Stop waits for the active batch to settle
and prevents later batches. Cancellation interrupts response polling and sends
Cloudflare OS `stopAgent(chatId)` for each active chat before closing the
connection. Remote cancellation errors produce a failed run and an API error.

Completed results stay unchanged. Unfinished results receive a stop error and
FAIL verdict so Retry errors can select them. The run remains running while
cancellation is pending, which blocks retries and deletion. After cancellation,
its status is stopped. The detail controls share the record loader's query
identity and refresh the run and results after stopping.

Migration `20261104110023_test-run-stop` extends the run status constraint. The
configured development database `carta` had the preceding migration and the
expected constraint. The new migration was applied there and to the guarded
test database. A fresh development query confirmed the new migration and the
constraint containing stopped.

The focused route/database and comparison suites passed all 11 tests. The stop
proof covers two active runs, cancellation acknowledgement, unchanged completed
results, blocked retry and deletion during shutdown, no later batches,
permission denial, missing and idle runs, error retry after stopping, and remote
cancellation failure. Disabling the abort request made the stop proof fail; the
request was restored and the full focused suites passed. The model service was
mocked at the existing runner boundary. The provider method and cancellation
semantics were checked against the local Cloudflare OS source in
`packages/workshop-backend/src/overseer.ts` (`stopAgent` and `cancelAgent`).

API, SDK, and web type checks and focused lint checks passed. Web lint retains
two reviewed control warnings from the result view and run delete icons.
Browser tests remain disabled by the existing feature instruction. Live model
cancellation and browser rendering were not verified. Evidence is under
`.local/verification/test-run-stop/`.

## Stop a run after its API worker is lost

The reported run `d3f70d6e-2cb0-43b9-8a64-6f67328ccfa8` had 44 completed
results and one unfinished T9-C2 result, with chat reference 337. Its persisted
status was running. The previous Stop path required the transient activeRuns
entry and returned test_run_not_active when that entry was missing. A route
regression test with a saved running fixture and no local worker reproduced
the rejection before the fix.

Stop now recovers that case through its saved chat references. It reconnects to
Cloudflare OS, cancels only matching active chats, and then marks the parent
stopped and unfinished results FAIL with the stop error. Idle and missing chats
are skipped. Duplicate stop requests in the same process share the recovery
work. A remote failure closes the abandoned run as failed and reports the error,
so it does not remain falsely running. Completed results and existing attempt
start times stay unchanged. Terminal writes require a still-running parent.
No schema or permission change is required.

The production stop operation was applied to the reported development run.
Fresh database reads confirmed status stopped, zero unfinished results, and
exact preservation of all 44 completed result records. The operation connected
to the configured live Cloudflare OS service; it did not start a model run.
Evidence is in `.local/verification/abandoned-run-stop/reported-run.log`.

Proof includes the real route/database regression, isolation from another saved
run, preserved completed results and times, failure during abandoned chat
cancellation, and adapter tests for matching active chats, absent or idle chats,
waiting for all cancellation requests, cleanup on failure, and an empty chat
list. The provider is mocked only at its RPC boundary for adapter tests and at
the existing runner boundary for route tests. Browser rendering remains
unverified; browser tests stay disabled by the existing feature instruction.

All 15 focused tests passed after the fix. API, SDK, and web type checks,
focused API lint, and git diff --check passed. The pre-fix regression log and
complete check logs are in `.local/verification/abandoned-run-stop/`.
