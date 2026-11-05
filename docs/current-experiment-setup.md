# Current experiment setup

Implementation review date: 1 November 2026.

This description distinguishes implemented behavior, recorded fixture
preparation, and live execution evidence. The combined-fixture preparation
records report a committed load and successful verification on 29 October
2026. A live database recheck on 1 November 2026 could not complete because
the remote machine was unreachable. This document therefore does not claim
that the recorded data or configuration remains unchanged at that later date.

This document describes the implemented experiment environment for evaluating
an agent's answers to HKA TROM analytical questions. It is context for revising
the thesis methodology, implementation description, evaluation procedure, and
interpretation of results. It describes system behavior and recorded data
preparation, not a completed model evaluation or a verified current live configuration.
The document is self-contained. Its terminology and procedures do not require
access to application source code, a repository, or earlier conversations.

## Study domain and terminology

HKA TROM is the toll-road operational information system that supplies the
study's business domain. Its data covers road sections, toll gates and booths,
transaction monitoring, traffic counts, incidents, accidents, inspections,
and service-performance configuration.

The following terms have specific meanings in this experiment:

| Term | Meaning |
|---|---|
| Analytical agent | A language-model-driven program that interprets a question, uses available tools to obtain facts, and constructs an answer. |
| Carta | The application framework used to build the experiment's web interface and test runner. In this document, the Carta application means that experiment application. |
| Cloudflare OS | The separate software environment that runs the analytical agent and connects it to models, instructions, context, and tools. Its name does not identify the inference provider. |
| Workspace | The configured Cloudflare OS environment in which case chats are created and agent resources are available. |
| Chat | One conversation created for a case execution, beginning with the complete case prompt. |
| Model provider | The service that runs the language model and returns its generated output. |
| Connector | The integration that makes a data service available as callable tools to the agent. |
| Context | Business definitions and reference documents available to the agent through Cloudflare OS. |
| Skill | A named set of instructions in a Markdown document, with descriptive metadata and optional supporting files. |
| Fixture | Prepared synthetic records that exercise a defined analytical situation and have a known expected answer. |
| Database schema | A named namespace of tables or views within a PostgreSQL database. |
| Response schema | A JSON Schema document that describes the required structure and allowed values of an answer. This is distinct from a database schema. |
| SPM | Minimum service standards used to evaluate operational performance. |
| SLA | Service-level agreement requirements used in the applicable performance evaluations. |
| LHR | Average daily traffic, referred to in Indonesian as Lalu Lintas Harian Rata-Rata. |

Business context must specify the interpretation of operational observations,
dates, units, aggregation rules, and service thresholds. A response schema
specifies how to express the answer; it does not, by itself, define the
business calculation.

## Research task and evaluation unit

The evaluated task is an operational analytical question expressed as a
natural-language prompt. The agent must obtain relevant data through the
available TROM tools, apply the required business definitions, and return an
answer in the requested format.

A test case contains the question and a prepared correct answer. One case
execution consists of submitting the case's complete prompt in a fresh
Cloudflare OS chat and comparing the returned answer with the prepared answer.
A test set is an ordered collection of cases. The initial execution of a run
processes its saved cases in order, submitting one prompt per case when the
connection permits. A setup or communication failure can prevent submission.
An explicit retry can submit a saved case again within the same run record.

## Components and responsibilities

| Component | Responsibility |
|---|---|
| Carta application | Manage test sets and cases, start runs, submit prompts through the Cloudflare OS API, save responses, and calculate PASS or FAIL. |
| Cloudflare OS | Host the agent, apply the available instructions and context, connect to the model provider, and make tools available to the agent. |
| TROM connector and backend | Describe available data entities and expose read operations over the configured operational database. |
| Model provider | Perform inference for the agent. |
| Researcher or operator | Prepare cases and correct answers, supply the intended data, configure the agent environment, select the experimental protocol, and interpret the saved outcomes. |

Carta and Cloudflare OS can run locally as separate services. Carta uses a
backend WebSocket RPC connection to Cloudflare OS. The configured local
Cloudflare OS endpoint is normally port 8787. The runner authenticates with
backend-held credentials and opens the configured workspace. Credentials and
session tokens are not part of a test prompt or expected answer.

An API is an application programming interface. The WebSocket connection
supports remote procedure calls, or RPC: the test runner invokes operations
on the separate Cloudflare OS service. A local endpoint identifies a service
on the researcher's machine; it does not imply that model inference is local
or that the experiment operates without a network connection.

The information flow is:

1. The researcher saves a prompt and expected answer in the experiment application.
2. The application sends the prompt to a fresh Cloudflare OS chat.
3. The agent uses the model and available tools to answer the question.
4. Tool requests pass through the TROM connector and backend to the operational database.
5. Cloudflare OS returns the agent's answer to the experiment application.
6. The application compares that answer with the privately stored expected answer and saves the outcome.

The experiment operational database and the Carta application database have
different purposes. The operational database supplies facts to the agent.
Carta stores cases, runs, and results. Creating a case or storing a result in
Carta does not load or change operational records.

## Test case content

The researcher supplies these fields through ordinary forms:

| Field | Content |
|---|---|
| Name | A case identifier or short descriptive name. |
| Prompt | The full user message sent to the agent, including the question and all case-specific response instructions. |
| Expected Result | The prepared correct answer, stored as text. Structured answers are stored as JSON text. |

Cases belong directly to a test set. The researcher changes case order by
dragging rows in the set's case table. New cases are appended to the set.

The Prompt field includes the response schema when structured output is
required. It can contain the JSON Schema, a requirement to return JSON without
additional prose or Markdown fences, and public conventions for dates,
identifiers, rounding, null values, labels, and array order. The runner sends
this text unchanged. It does not generate or append a schema during execution.

Expected Result contains the correct answer values, not the response schema.
The researcher prepares this answer before execution, using calculations or
other independent evidence outside the runner. Saving or running a case does
not invoke an answer-generation procedure. The runner does not send Expected
Result to Cloudflare OS.

### Combined fixture case inventory

The combined fixture set contains 15
cases across these analytical domains:

| Task | Subject |
|---|---|
| T1 | Average transaction duration. |
| T2 | Traffic volume and daily average traffic. |
| T3 | Monthly traffic and daily-average trends. |
| T4 | Incident status and unresolved incidents. |
| T5 | Accident-cause distribution. |
| T6 | Inspection condition and damage summaries. |
| T7 | SPM and SLA evaluation for a transaction-monitoring event. |
| T8 | SPM and SLA reporting over a period. |
| T9 | SPM and SLA comparison between two periods. |

All 15 cases belong to the combined set. Their prepared scopes are:

| Case | Road section | Requested period or event date |
|---|---|---|
| T1-C1 | PEKBANG | 1–7 February 2026. |
| T1-C2 | BINSTA | 25–30 January 2030. |
| T2-C1 | PEKBANG | 1–7 March 2030. |
| T3-C1 | PEKBANG | January, February, and March 2026. |
| T4-C1 | PEKBANG | 1–30 April 2026. |
| T5-C1 | PEKBANG | 1–30 April 2030. |
| T6-C1 | PEKBANG | 1–31 May 2026. |
| T7-C1 | PEKBANG | Bangkinang gate, shift 1, 1 June 2026. |
| T7-C2 | BINSTA | Stabat gate, shift 1, 2 June 2030. |
| T7-C3 | INKIS | Limapuluh gate, shift 1, 3 June 2026. |
| T7-C4 | PEKBANG | Bangkinang gate, shift 1, 26 January 2026. |
| T8-C1 | BINSTA | 1–7 June 2026. |
| T8-C2 | BINSTA | 20–30 January 2026. |
| T9-C1 | PEKBANG | Compare 1–7 July with 8–14 July 2026. |
| T9-C2 | PEKBANG | Compare 5–10 January with 12–17 January 2026. |

PEKBANG identifies Pekanbaru–Bangkinang, BINSTA identifies Binjai–Stabat,
and INKIS identifies Indrapura–Kisaran. The dates are synthetic analytical
scopes, not dates when model executions took place. The application permits
additional sets and cases, so this prepared set does not by itself identify
the runs selected for a thesis analysis.

The expected answers in this inventory are calculated outside the runner
from the combined case data and the application's effective master and
service-configuration records. They include the assigned record identifiers,
the requested dates, and the effective thresholds. They are supplied during
case preparation, independently of the responses from the executions being
scored. This separation does not by itself prove that the calculation has
no defects.
The submitted messages contain the associated question, public representation
conventions, and response schema. Here, public means information provided to
the evaluated agent, as distinct from the private expected answer.
Preparation includes explicit array-order instructions, calculation
conventions, actual table names, and integer booth-number instructions for the
runner's exact comparison. The case label T7-C2, for example, identifies case
2 within task T7; it is an identifier, not an instruction to select a database.
The expected answer payload is not included in the submitted message. Prompts
do not use filters that select the assigned synthetic record IDs. The agent must identify relevant records
from the requested business scope and the tool catalogue.

## Data preparation and the fixed-data assumption

The experiment assumes that the researcher supplies the intended dataset and
keeps it fixed during the executions included in an evaluation. Data selection,
loading, copying, and maintenance are operator tasks outside Carta.

The recorded preparation target is the PostgreSQL database `hkatrom_bi`,
schema `public`, on the remote machine identified as `gamingmachine`.
The 15 cases share this data environment. Their operational records use
assigned synthetic IDs. The preparation record reports 237 inserted rows
across 15 tables, including one synthetic support employee, and preservation
of existing application rows and master configuration.

The prepared dates for T1-C2, T2-C1, T5-C1, and T7-C2 are in 2030. The dates
and assigned IDs in their expected answers match their prepared records.
Service evaluations use the effective application configuration. Relevant
SLA thresholds, in seconds, are:

| Case | Rule code | SLA threshold |
|---|---|---:|
| T7-C4 | kecepatan-transaksi-1 | 6 |
| T8-C2 | kecepatan-transaksi-3 | 9 |
| T9-C2 | kecepatan-transaksi-1 | 6 |

The expected compliance results use these values. For example, the prepared
T7-C4 evaluation with an average duration of 5.5 seconds passes both the
6-second SPM threshold and the 6-second SLA threshold for
`kecepatan-transaksi-1`. A case identifier alone does not establish coverage
of a distinct SPM-versus-SLA threshold condition.

A separate preparation and verification script reads the combined data and
recalculates the 15 answers. Its recorded checks include fixture row content
and relevant matching operational records, including records outside the
inserted fixture IDs. A new matching operational record can therefore affect
an expected answer. These checks are operator-run preparation operations;
the Carta run operation does not invoke them. The recorded verification on
29 October 2026 reports all 237 fixture rows and all 15 answers verified.

Each expected answer applies to this particular data population and business
configuration. The recorded preparation target must still be distinguished
from the actual database exposed by the tool connection during each reported
run. A successful load record does not verify that connection, guarantee
unchanged data, or establish a model outcome.

The operator must make the appropriate case data available through the tool
connection used for execution. Carta does not switch schemas or database
connections between cases. The combined set is prepared for one shared
database and schema. A set can execute correctly as a batch only when
the configured tool environment can answer every included prompt against its
intended data. Any external case-specific data setup belongs in the study's
execution procedure.

The runner does not store dataset revisions, calculate data fingerprints,
verify a database copy, seal tables, or prevent data changes. Responsibility
for a mismatch or data change rests with the operator. These are assumptions
and operator responsibilities, not guarantees provided by the runner.

## Agent instructions, skills, models, and tools

Agent configuration resides in Cloudflare OS. Carta provides these management
pages through the Cloudflare OS API:

| Page | Scope and behavior |
|---|---|
| Agent Instructions | Read and edit deployment-wide agent instruction text. The text supplements the built-in system prompt. The current API accepts up to 8,000 characters. |
| Skills and Context | Manage accessible collections, documents, and skills. Collection permissions determine write access. Git-backed collections are read-only in Carta. |
| Model Providers | Inspect account-configured models and available deployment AI Gateway metadata. AI Gateway is an optional deployment facility for routing and configuring model access. This page is read-only. |
| Connectors | Inspect deployment connector availability and advertised resource types. This page is read-only. |

A collection groups context documents and skills. A skill consists of a
Markdown manifest and, where applicable, supporting documents in its
collection. Markdown is a text format for structured documents. Frontmatter
is the metadata block at the start of a skill manifest, including its name
and description. Skill edits retain the full Markdown content and frontmatter.
A Git-backed collection takes its content from version-controlled files and
is available for reading through this interface. Agent Instructions apply
across the deployment, meaning the configured Cloudflare OS installation,
rather than only one case or workspace. Context access
belongs to the configured Cloudflare OS account and its collection permissions.
Neither is stored as a separate configuration copy in Carta.

The TROM integration exposes three read operations:

- `list_entities`: list available data entities.
- `describe_entity`: describe an entity's fields, relationships, and supported filters.
- `read_records`: retrieve selected fields with filters, sorting, a limit, and pagination.

In the current integration code, a native Cloudflare OS TROM connector forwards
these operations to the HKA TROM backend's Agentic BI endpoints. The backend
resolves the relations and queries its configured PostgreSQL database. The
inspected backend catalogue code selects relations in the `public` schema.
This is a property of that implementation, not verification of the database
connection or deployed configuration used for a reported run. The three
operation names alone do not establish which dataset is available.

The backend is the data-serving part of the TROM application. Its Agentic BI
endpoints are HTTP API operations for entity discovery, metadata inspection,
and record retrieval. PostgreSQL is the relational database system. The
`public` schema is a database namespace, not a statement that its data is
publicly accessible. Pagination divides a large result into pages; subsequent
requests use a returned cursor to retrieve further records. Record reads
accept selected column names and combine supplied filters with AND. They do
not accept SQL expressions or joins. The agent must combine returned records
and calculate the requested aggregates itself. The default page limit is
100 records and the permitted limit is 1 through 500 records.

The runner selects the first model returned by the configured workspace's
model list when it creates its execution client. The selected model is used
for the case chats handled by that client. Model selection is not a test-case
field, and the run records do not save a model configuration snapshot. A case
retry creates a new execution client and resolves the model again.

For the thesis, identify the actual model, provider, inference settings,
agent instructions, context content, tool implementation, and data connection
used for the reported executions from separate supporting records. The runner
does not freeze these settings or record which context documents the agent
retrieved. A fresh chat does not establish isolation from provider state or
from shared workspace resources.

## Execution procedure

1. Prepare the correct data and agent configuration outside the run operation.
2. Create a test set and enter its cases, complete prompts, and expected answers.
3. Arrange the cases in the intended order.
4. Start the run from the test-set detail page.
5. Inspect the saved results from the run detail page. Use Refresh to load current progress and completed responses.

At run creation, Carta saves a copy of each selected case's name, prompt,
expected answer, and position in result records. Subsequent edits to the case
form do not change these saved inputs.

Execution continues in the application backend when the user navigates away
from the page. The backend processes cases sequentially within a run. For each case it
creates a fresh chat, submits the saved prompt as the initial message, and
saves the chat reference. It checks the chat until the agent is inactive and
an agent answer is available, or an error occurs. It then compares the answer
and saves the result before processing the next case.

The client applies a 30-second timeout to individual RPC operations. Its
response-wait loop has a ten-minute deadline and normally checks chat state
every two seconds. This deadline limits the client's wait. It is not an
enforced model execution budget, and expiry does not stop the remote agent.
There are no runner-enforced limits on token use, tool calls, or workspace
actions. A timed-out remote chat may continue while the runner submits a
later case, so sequential processing in Carta does not guarantee that remote
agent activity never overlaps. Separate run records can also execute
concurrently. The background task is not a durable queue and does not
automatically resume after an application process stops.

## Answer comparison

The comparison is deterministic and operates on the saved expected text and
the actual response text.

If Expected Result parses as JSON, the actual response must also parse as
JSON. Comparison then follows these rules:

- Object property order does not matter.
- Object property names and values must match. Missing or extra properties fail.
- Array elements must match in the same order.
- Strings, numbers, booleans, and null retain their JSON types. A numeric string does not equal a number.
- Numbers are compared as parsed JavaScript numbers. There is no numerical tolerance or additional rounding step.

For example, an expected answer of `{"count": 2, "status": "pass"}` matches
`{"status": "pass", "count": 2}`. It does not match
`{"count": "2", "status": "pass"}`, because `"2"` is a string. An expected
array `[1, 2]` does not match `[2, 1]`. These are illustrations of the
comparison rule, not study observations.

If Expected Result does not parse as JSON, the runner removes leading and
trailing whitespace from both texts and requires exact text equality. Internal
spacing, letter case, and wording remain significant.

The response schema in the prompt guides the agent's output. The runner does
not run a separate JSON Schema validator or a task-specific semantic validator.
It does not reorder arrays, convert numeric strings, infer equivalent answers,
calculate partial credit, or use another model to grade an answer.

A matching answer receives PASS. A mismatching answer receives FAIL. Invalid
actual JSON receives FAIL when the expected answer is JSON. A request error,
response error, or timeout also receives FAIL, with the execution error saved.
The verdict therefore describes successful execution and exact answer matching
together. It is not, on its own, a classification of the cause of a failure.

## Run status, repetition, and retry

A run has a running, completed, or failed status. Pending result rows have no
verdict yet. A completed run can contain
failed cases: completed means that the run finished processing its cases.
Each case has its own PASS or FAIL verdict. An execution-client setup failure
can fail the run and mark pending results as FAIL with an error.

An initial run processes each saved case once, subject to execution failures.
The researcher determines the number of repetitions by starting separate runs. The application does not enforce a
fixed repetition count, select a statistical sample, or produce an aggregate
research report. A thesis statement about repetition count must identify the
actual runs included in the analysis.

The result table provides a manual retry action for users with execution
permission. A retry is accepted when the run is idle. It uses the saved prompt
and expected answer in a fresh chat. It replaces that result row's response,
verdict, error, chat reference, and attempt times. Accepting the retry clears
the previous values before the new response is available. Other result rows retain
their saved values. The application rejects a retry while that Carta run is
marked running. This guard does not stop remote activity from an earlier
timed-out chat.

A retry does not create a separate attempt-history record. The previous result
is no longer available in that Carta row. Consequently, a saved run can contain
results from its initial execution and from later manual retries. The
researcher's reported sampling and retry procedure must account for this
behavior. Separate run records retain the results of separate set executions.

## Saved evidence and interpretation

Carta stores the following experiment records:

| Record | Saved information |
|---|---|
| Test set | Name, optional description, identity, and audit timestamps. |
| Test case | Set membership, name, full prompt, expected answer, order, and audit fields. |
| Run | Set reference and saved set name, status, error where present, initiating user, and timestamps. |
| Case result | Saved case name, prompt, expected answer, order, actual response where available, verdict, error, chat reference, and start and finish times. |

The result dialog shows the saved input and expected answer together with the
actual response, verdict, error, and chat reference. This permits direct
inspection of the comparison. Cloudflare OS retains its own chat records, but
Carta does not automatically archive the complete conversation, tool inputs
and outputs, action history, token counts, or model and context configuration.

Saved times describe application events and waiting intervals. They are not
measurements of model inference time alone. A retry retains the run's initial
start time and updates its finish time, so that interval can include the wait
before a manual retry. PASS establishes that the saved
response matched the saved answer under the stated comparison. It does not
establish the correctness of the prepared answer, a particular reasoning path,
tool correctness, dataset identity, or controlled experimental conditions.

Results reported in the thesis need a declared set of executions, the data and
configuration used, a repetition and retry procedure, and an explanation of
how execution errors enter the analysis. Study-specific measurements and
outcomes require supporting evidence beyond this description of the software.

## Study-specific information for thesis revision

This document establishes the software procedure and its interpretation. The
following values describe an actual study execution and must come from the
researcher's study records or from the thesis material being revised:

| Information | What the thesis must identify |
|---|---|
| Research sample | Selected cases, complete prompts, response schemas, expected answers, and the rationale for the selection. |
| Data population | Actual database and schema exposed to the tools, relevant records and periods, configuration thresholds, and how the fixed-data assumption was maintained. |
| Agent environment | Actual model and provider, available inference settings, instruction text, context documents, skills, and connector configuration. |
| Execution protocol | Included runs, number of repetitions, execution order, treatment of retries, and treatment of execution errors. |
| Observations | Responses, PASS and FAIL counts, execution errors, and any separately collected traces or resource measurements. |
| Analysis | The evaluation denominator, aggregation method, treatment of overwritten retries, and limits on the conclusions. |

For a reported exact-match rate, define the included case executions and state
whether executions with errors remain in the denominator. The software's
case-level verdicts alone do not define that research decision. If every
included execution is counted, the exact-match rate is the number of PASS
outcomes divided by the number of included case executions. A different
denominator requires an explicit definition and supporting records.

The descriptions of cases and procedures in this document do not establish
a completed number of repetitions, a measured success rate, a particular
model's performance, or a verified dataset configuration. Those statements
require study-specific evidence. No source repository or local implementation
file is needed to understand the procedure described here.
