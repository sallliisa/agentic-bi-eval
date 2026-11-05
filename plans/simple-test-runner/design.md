# Simple test runner

Design: Approved
Implementation: In progress

## 1. Purpose and scope

The user authorized a fresh build from Carta baseline 16e96c1 on 2026-10-27.
Discard the previous implementation. Build only test sets, their cases, and
runs. The operator prepares expected answers and keeps source data fixed.
The application does not verify, select, change, or protect source data.

Keep standard Carta authentication, permissions, navigation, and controls.
Browser tests are disabled by user instruction. Cloudflare OS and its data
connections remain configured outside this application. Agent Configuration
is outside this initial rebuild.

## 2. Functional requirements

| # | Capability | Users and access | Expected result |
|---|---|---|---|
| R1 | Manage sets | Authorized signed-in users | Standard set list, create, detail, and edit pages. |
| R2 | Manage cases | Authorized signed-in users | Standard case ListView below set DetailView, with Create and View/Edit/Delete actions scoped to that set. Users with manage access can drag the full, unfiltered list to set case run order. New cases append to the end. |
| R3 | Configure and run a set | Authorized signed-in users | The Run action opens a dialog. The user can set an optional run name, choose a model, and set a repetition count. Use the set name when the run name is empty. Default repetitions to 1. Execute each saved case the requested number of times in fresh Cloudflare OS chats, using the selected model. Do not set an upper repetition limit. |
| R4 | Inspect and retry results | Authorized signed-in users | A run list and detail show run status and case pass counts. Show one result row per test case with the number of passing repetitions over the requested count. Opening a case shows each repetition's saved response. An authorized user can retry one repetition, retry only execution errors, or refresh the whole run. |
| R5 | Manage runs | Users with execute-test-runs access | Edit only the run name. Delete a finished run and its saved results after confirmation. Block deletion while the run is active. |
| R6 | Stop a run | Users with execute-test-runs access | Stop the selected active run from a button next to Retry errors. Cancel its active chats, prevent later batches, keep completed results, and mark unfinished results with a stop error. Other runs continue. |

## 3. Data and business rules

### Set and case

| Record | Fields | Rules |
|---|---|---|
| Test set | ID, name, optional description, normal timestamps | Cases belong directly to one set. |
| Test case | ID, set ID, name, prompt, expected result, execution position, normal timestamps | Use a normal form with text and textarea inputs. The form does not set execution position. Dragging the full, unfiltered case list saves its order for future runs. Preserve the prompt as entered. The expected result is prepared answer text, which can contain JSON; no whole-case JSON import or task-specific input format is required. |

The case has no dataset reference, fingerprint, revision, output schema,
comparison profile, or benchmark task type. Prompt and expected answer are
operator-controlled. Do not append business rules or rewrite the prompt.
Saving a case does not contact the operational database or run the model.

### Run and result

| Record | Fields | Rules |
|---|---|---|
| Run | ID, run name, set reference/name, selected model ID, repetition count, status, normal start/finish times | The run name defaults to the saved set name when blank. Save the model and repetition count with the run. Existing runs migrate with their set name and one repetition; their model ID stays unknown. Save the selected case inputs before execution. Run in the backend so browser navigation does not stop it. |
| Case result | ID, run ID, saved case name/prompt/expected result, position, repetition number, actual response, verdict, error, chat reference, times | Create one result for each case repetition. Display saved input rather than the current editable case. Old results survive later case changes. |

Send each saved prompt once for each requested repetition. Use the selected model
for each fresh chat and for retries. Keep a basic request timeout and record
errors. Execute results in batches with the repetition count as the batch size. Wait for each batch to finish before starting the next batch. The case summary counts only PASS results in its numerator and uses the
requested repetition count as its denominator. While a run is in progress, the
summary reflects results completed so far.

After a run finishes, users with execute access can explicitly retry one
repetition. Use its saved prompt and expected answer in a fresh chat, and
replace only that repetition's response, verdict, error, chat reference, and
attempt times. Keep the other repetition rows unchanged. Do not accept
overlapping execution in the same run. Refresh shows the completed retry through
the existing run refresh action.
The run detail's global Refresh action reruns every saved repetition in the
current run. Keep the run identity and saved inputs, use the run's saved model,
and replace every repetition's response, verdict, error, chat reference, and
attempt times. Clear prior result values before execution. Confirm this action
because it replaces all saved responses. Do not accept overlapping execution
in the same run. While the run is active, show its current status and results;
when it completes, refresh the run and result records. Users without run
execution access keep a read-only Refresh action.
The Retry errors action retries only saved repetitions with a non-null error.
Keep PASS results and comparison FAIL results without an error unchanged.
Use the saved model and inputs, reset only the selected repetitions, and keep
the run identity. Reject overlapping execution. If there are no errors, report
that there is nothing to retry and leave the run unchanged.

Run editing changes only its non-blank name. Keep saved inputs and results.
Run deletion removes the run and its results without deleting its test set or
cases. Reject deletion while the run is active.

A run can also have status stopped. Stop applies to a saved running run. If its local worker exists, cancel it
and wait for its active work and remote cancellation to settle. If its worker
is missing after a restart or reload, use the saved chat references to cancel
any matching active remote chats, then close the unfinished results and record
stopped. Already idle or missing remote chats require no cancellation. Preserve completed results. Unfinished
results become FAIL with a stop error and can be selected by Retry errors.
Remote cancellation failures leave the run failed and report the error.
Stopping a finished run is rejected. Execution, retry, and deletion remain
blocked until stopping has finished. No other run is stopped.

Do not add automatic retries, chat discovery, manual reconciliation, release
actions, dataset preflights, or a distributed workspace reservation system.
Use normal pending controls to prevent accidental duplicate submission.

Comparison is deterministic: if the expected text is valid JSON, compare
parsed JSON values, ignoring object key order and retaining array order.
Otherwise compare text after trimming outer whitespace. Invalid actual JSON
or unequal values is FAIL. No business-rule checks or model grading.

Cloudflare OS credentials stay in the backend environment. Use its configured
workspace and an available configured model. Only the actual API protocol
needed for login and chat execution belongs in the client; no runtime
dependency on the thesis repository or its tools is allowed.

## 4. User journeys and workflows

1. Create or open a test set.
2. Manage cases through the standard ListView below its DetailView. Drag rows in the full, unfiltered list to change run order. Search results cannot be reordered.
3. Click Run to set the optional name, model, and repetition count, then start
   the run.
4. Review the pass count for each case. Open a case to compare the saved prompt
   and expected result with each repetition's exact model response, verdict, and
   error. Refresh the whole run to rerun every saved repetition and replace its
   prior results.

| Condition | Result | Next step |
|---|---|---|
| Empty set | Do not start a run. | Add a case. |
| Run name is blank | Use the saved test set name as the run name. | Continue run setup. |
| Repetition count is 1 | Create and execute one result for each saved case. | Review case pass counts. |
| Search is active on the case list | Disable row dragging. | Clear search to reorder the full list. |
| Invalid ordinary form input | Preserve input and show its field error. | Correct and submit. |
| Wrong parent or missing permission | Deny access without writes. | Use the correct authorized page. |
| Request or model error | Save FAIL and its error. | Operator can inspect or start another run. |
| Case changes after execution | Keep saved run inputs unchanged. | Inspect historical results in the dialog. |

Use shared Carta components. No custom file picker, domain-specific form
engine, configuration freeze, or hidden expected-answer calculation.
