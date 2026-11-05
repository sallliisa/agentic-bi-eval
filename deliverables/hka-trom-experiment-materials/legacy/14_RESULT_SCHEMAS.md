# Structured Result Contracts

The benchmark has one JSON Schema 2020-12 contract per analytical task. Multiple cases of the same task use the same schema. The evaluated agent receives the matching schema and these public representation conventions before each run. Cloudflare OS has no separate structured-output field in the inspected interface, so the manual runner preserves the canonical case prompt separately and composes it with the task-specific public conventions and matching schema into one exact user message. The operator submits the entire `submission-message.txt` once; the archived run stores the canonical prompt and submitted text separately and binds both hashes.

A response that cannot be parsed and validated against the required schema fails the run. Schemas reject additional properties. Dates use ISO calendar-date strings. IDs and counts are JSON integers; labels and categorical values are compared with their exact stored spelling and case. Use section, gate, vehicle-class, asset, and cause labels from the matching master records without translating or normalizing them.

## Task-to-schema mapping

| Task | Schema |
|---|---|
| T1 Average transaction duration | `schemas/t1_transaction_duration.json` |
| T2 Traffic summary | `schemas/t2_traffic_summary.json` |
| T3 Monthly traffic/LHR trend | `schemas/t3_traffic_trend.json` |
| T4 Incident status and unresolved incidents | `schemas/t4_incident_status.json` |
| T5 Accident-cause distribution | `schemas/t5_accident_causes.json` |
| T6 Inspection condition summary | `schemas/t6_inspection_summary.json` |
| T7 Single-event transaction SPM/SLA evaluation | `schemas/t7_spm_sla_event.json` |
| T8 Period transaction SPM/SLA report | `schemas/t8_spm_sla_period.json` |
| T9 Transaction SPM/SLA period comparison | `schemas/t9_spm_sla_comparison.json` |

## Public representation conventions

| Field or task | Required public meaning and representation |
|---|---|
| T1 `average_transaction_duration` | Arithmetic mean of matching non-null detail observations in seconds, displayed as a JSON number rounded to two decimal places with ties away from zero. Use numeric zero when the population is empty. `1.2` and `1.20` represent the same JSON numeric value. |
| T2/T3 `lhr` | Average daily traffic as a JSON integer, rounded to the nearest whole vehicle per day with half upward for nonnegative volume. T2 uses the inclusive requested calendar-day count; T3 uses every day in each complete requested calendar month. |
| T2/T3 volume fields | Vehicle counts, not counts of rows. T2 includes every configured vehicle class; T3 includes every requested month and configured class. Use zero where no matching volume is recorded. |
| T4 incident status | The unresolved record status is exactly `under_investigation`. Counts partition incident identities; the unresolved array identifies the under-investigation records. |
| T5 cause labels | Use the exact cause ID and name from the governed accident-attribute master. Counts describe cause assignments; a report may contain multiple or repeated causes. |
| T6 classifications | Category keys are exactly `r1`, `r2`, and `r3`; repair-priority keys are exactly `p1` and `p2`. Asset IDs/names identify the legacy inspection/maintenance asset-master entry exposed by the catalogue alias `assets`. |
| T7 `shift` | JSON integer shift number from the identified dated schedule. It is not a shift name or schedule ID. |
| T7/T8 `booth_number` | Positive booth number within its monitoring report. A JSON integer is preferred. The schema also permits a canonical positive integer string such as `"2"`; leading-zero, decimal, or nonnumeric strings are invalid. |
| T7/T8 `average_transaction_duration` | Display the arithmetic mean for that report/booth to two decimal places as a JSON number, with ties away from zero. Evaluate SPM/SLA with the underlying unrounded mean; display rounding never changes pass/fail. |
| T7/T8 non-applicable SLA | When `sla_applicable` is false, set both `sla_parameter` and `sla_passed` to null. When applicable, return the effective configured threshold and a boolean result. Missing configuration is a gap, not non-applicability. |
| T7/T8/T9 rule identity | Return the exact configured rule code, such as `kecepatan-transaksi-1`; use the operator, thresholds, and applicability supplied by the effective configuration. Do not replace source values with universal constants. |
| T9 transitions | Return the exact enum in the schema. A transition involving `not_applicable` records an applicability change. |

A JSON Schema number does not enforce lexical trailing zeros; comparison uses the numeric value after the required rounding. No public rule permits an arbitrary value to be rounded after the response is produced.

## Canonical ordering before comparison

- vehicle classes: `vehicle_class_id` ascending;
- months: chronological ascending, then vehicle class ascending;
- unresolved incidents: `incident_date`, then `incident_id` ascending;
- accident causes: `assignment_count` descending, then `cause_id` ascending;
- assets: `damaged_item_count` descending, then `asset_id` ascending;
- event SPM/SLA evaluations: `booth_number`, then `spm_code` ascending;
- period failures: `date`, `monitoring_transaction_id`, `booth_number`, `spm_code` ascending;
- indicator summaries/comparisons: `spm_code` ascending.

The schemas define information content, not prose or UI. The evaluator matches rows by task identity, rejects duplicate/missing/extra rows, and applies only the representation normalizations explicitly permitted by the schemas and private evaluator policy.
