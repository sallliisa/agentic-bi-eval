# Transaction SPM/SLA

## Indicator family

These rules concern average transaction duration per monitored booth. They do not define queue-length, incident-response, equipment, or other SPM families.

| Rule code | Indicator label |
|---|---|
| `kecepatan-transaksi-1` | Gerbang tol sistem terbuka |
| `kecepatan-transaksi-2` | Gerbang tol sistem tertutup (Gardu Masuk) |
| `kecepatan-transaksi-3` | Gerbang tol sistem tertutup (Gardu Keluar) |
| `kecepatan-transaksi-4` | GTO (Gardu Tol Ambil Kartu) |
| `kecepatan-transaksi-5` | Gardu Tol Transaksi |

Each monitored booth average is evaluated against **all five indicators** configured for its section. The indicator labels do not select one exclusive rule based on an inferred gate type.

## Governed configuration

`view_section_spm_sla` supplies each section's rule identity (`spm_id`, `code`), descriptions, comparison operator (`operator`), SPM threshold (`spm_parameter`), SLA threshold (`sla_parameter`), SLA applicability (`is_applicable`), and unit (`unit`). Thresholds and applicability belong to that effective configuration, not to a universal table of constants in this package.

SPM and SLA are separate targets for the same measurement. SLA applicability is per section and indicator: all, some, or none of a section's indicators can have an applicable SLA. A numeric SLA parameter alone does not establish applicability. Missing configuration is not the same as explicitly non-applicable SLA.

When a section has no SLA override for an active indicator, the effective configuration uses the SPM parameter and specification as the SLA defaults and marks SLA applicable. An explicit section override controls its own threshold and applicability. These defaults are already resolved in `view_section_spm_sla`; an absent effective rule or an applicable rule without a threshold remains a configuration gap.

This view contains the current section configuration. It has no validity-date range or rule-version field. In this reporting environment, the current configuration applies to observations in the requested period, including a past period. A request for the rules that were in force at the event date needs a separate historical configuration source; the operational date alone cannot reconstruct that history.

## Measurement and evaluation grain

The measurement is the arithmetic mean of `transaction_duration` samples with `type = booth`, for **one booth within one monitoring report**. It is measured in seconds. Other observation types, including `longbooth`, are outside this transaction-speed compliance population.

A booth's samples have equal weight within that mean. The same booth number in another report is a separate measurement. Valid booth numbers run from 1 through the report's declared `total_booth`. Out-of-range booth numbers or null-duration booth samples are data-quality gaps, not evidence of zero duration. A declared booth with no samples has no observed average; declared booth counts are not sample counts.

One evaluation is identified by monitoring-report ID, booth number, and indicator identity. Its operational date, section, gate, and shift belong to the monitoring report. The same measurement can pass one indicator and fail another because the thresholds differ.

## Compliance states

A measurement passes a target when it satisfies the configured operator and threshold in the configured unit. For this transaction-speed family, the current operator is `<=` and the unit is seconds: equality passes. Compliance uses the unrounded booth average; display rounding must not change the decision.

An applicable SLA has its own pass/fail result. A non-applicable SLA has no pass/fail result: its event result is null and its summary state is `not_applicable`. SPM remains evaluable when SLA is non-applicable.

A failure detail describes an evaluation where SPM failed, applicable SLA failed, or both. Both failures can belong to the same evaluation.

## Period meaning

For an indicator over a period containing evaluations, period status is **fail if any evaluation fails, otherwise pass**. This applies independently to SPM and applicable SLA. A period-wide average does not replace the individual booth evaluations.

Evaluation count measures booth/report/indicator evaluations, not source samples. Failed count measures the subset that failed the corresponding target. Non-applicable SLA has zero applicable evaluations, zero failures, and state `not_applicable`.

A period with no observations provides no measured compliance evidence. This package does not assign a no-observation compliance default; report that gap rather than presenting it as an observed pass.

A period comparison retains each period's status, evaluation count, and failed count for the same section and indicator. A change between pass and fail is a compliance change; a change involving `not_applicable` is an applicability change. Different observation counts describe different coverage, even if the status is unchanged.
