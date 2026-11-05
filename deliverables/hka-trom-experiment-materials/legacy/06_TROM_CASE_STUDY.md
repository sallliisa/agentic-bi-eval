# HKA TROM Case Study

## Role

HKA TROM is a private production information system used as the empirical case study. The thesis is about Agentic BI, not about evaluating TROM itself.

TROM is useful because it contains connected operational data, business-specific semantics, and existing analytical behavior that can be qualified as hidden reference behavior.

## Analytical coverage selected from TROM

The nine benchmark tasks span five operational domains:

| Domain | Analytical behavior represented |
|---|---|
| Transaction monitoring | direct numerical aggregation and scope selection |
| Traffic volume / LHR | derived KPI, calendar-day denominator, grouping, time trend |
| Incident operations | derived state, record identification, multi-valued categorical aggregation |
| Inspection / assets | nested relationships and business taxonomies |
| Transaction SPM/SLA | aggregation at correct grain plus governed rule evaluation and period semantics |

These domains are coverage anchors. They are not formal experimental strata and are not required to contain equal numbers of tasks or cases.

## Qualified incident semantics

TROM contains conflicting paths for an incident with zero handling actions. The benchmark uses one coherent definition everywhere:

> An incident with zero handling actions is **under investigation**.

An incident is closed only when it has at least one handling action and every action is complete. Stage `100` means complete; null stage is incomplete.

`is_accident` is a boolean flag, not an accident category. Accident-cause analysis uses recorded accident causes. One accident may contribute multiple cause assignments.

## Qualified transaction SPM/SLA semantics

The selected transaction-speed indicators are:

- `kecepatan-transaksi-1` — Gerbang tol sistem terbuka — SPM `<= 6` seconds;
- `kecepatan-transaksi-2` — Gerbang tol sistem tertutup (Gardu Masuk) — SPM `<= 5` seconds;
- `kecepatan-transaksi-3` — Gerbang tol sistem tertutup (Gardu Keluar) — SPM `<= 9` seconds;
- `kecepatan-transaksi-4` — GTO (Gardu Tol Ambil Kartu) — SPM `<= 4` seconds;
- `kecepatan-transaksi-5` — Gardu Tol Transaksi — SPM `<= 5` seconds.

For one monitoring transaction, average `transaction_duration` is calculated per monitored booth. Every booth average is evaluated against all five effective rules for the section. SLA is evaluated only when the effective section configuration marks that rule as applicable.

The database extract establishes three SLA applicability patterns used by the benchmark:

- an ordinary fully-applicable section: PEKANBARU - BANGKINANG (PEKBANG);
- a partially-applicable section: BINJAI STABAT (BINSTA), where only `kecepatan-transaksi-3` has SLA applicable;
- a non-applicable section: INDRAPURA - KISARAN (INKIS), where SLA is not applicable to any of the five selected rules.

## Why stored `spm_sla` rows are not used

Stored `spm_sla` records already encode target pass/fail results, so exposing them to the agent would leak the answer.

They are also unsuitable as direct ground truth because the extracted production data contains duplicate derived rows and module references that no longer join cleanly to source monitoring records.

Expected SPM/SLA results are recomputed from raw monitoring records plus effective configuration.

## Evidence

- Source-code observations: `APPENDIX_TROM_SOURCE_EVIDENCE.md`.
- Database-derived SPM/SLA observations: `APPENDIX_SPM_SLA_DATABASE_EVIDENCE.md`.
- Sanitized extract: `evidence/hka_trom_transaction_spm_sla_extract.zip`.
