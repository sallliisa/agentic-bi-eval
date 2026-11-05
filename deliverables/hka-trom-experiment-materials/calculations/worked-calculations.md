# Worked expected-result calculations

The runnable calculation is `reproduce.py`. It reads only `case-definitions.json` and `calculation-inputs.json`. It does not read the saved expected outputs. It uses rational arithmetic for means and rounds with ties away from zero. `calculation-verification.json` records that all 15 outputs match the saved expected values and run responses.

## T1-C2 — average transaction duration

The scope is BINSTA, 2030-01-25 through 2030-01-30. One monitoring report is in scope. It has seven non-null duration observations across the detail types: `10, 10, 10, 10, 10, 10, 2` seconds.

`(10 + 10 + 10 + 10 + 10 + 10 + 2) / 7 = 62 / 7 = 8.857142…`; round to two decimal places: **8.86 seconds**. Each detail observation has equal weight.

## T2-C1 — traffic volume and LHR

The scope is PEKBANG, 2030-03-01 through 2030-03-07. Three traffic reports exist in the seven-calendar-day period. Sum `toll_traffic_volumes.total` by active class:

| Class | Volume |
|---|---:|
| Gol. 1 | 45 |
| Gol. 2 | 18 |
| Gol. 3 | 3 |
| Gol. 4 | 0 |
| Gol. 5 | 1 |

Total volume is `45 + 18 + 3 + 0 + 1 = 67`. LHR uses all seven calendar days, including days without a report: `67 / 7 = 9.571428…`; round to the nearest integer with ties away from zero: **10**.

## T4-C1 — incident status

The scope is PEKBANG, 2026-04-01 through 2026-04-30. Four incidents are in scope. An incident is unresolved when it has no action or when any action stage is not 100.

| Incident | Date | Action stages | Result |
|---|---|---|---|
| 1600500001 | 2026-04-02 | none | unresolved |
| 1600500002 | 2026-04-08 | 50 | unresolved |
| 1600500003 | 2026-04-15 | 100, 100 | closed |
| 1600500004 | 2026-04-21 | 100, null | unresolved |

The result is four incidents, three under investigation, and one closed. The unresolved IDs are 1600500001, 1600500002, and 1600500004.

## T6-C1 — inspection condition

The scope is PEKBANG, 2026-05-01 through 2026-05-31. Four damaged items are in scope. Three have categories `r1`, `r2`, and `r3`; the fourth has the non-null category `legacy-other`, so it counts in the total but not in those three category buckets. One damaged item has no repair priority.

The four damaged items map to assets as follows:

- Asset 1, Bahu: three items.
- Asset 2, Lajur 1: one item.

Counts are four damaged items; `r1=1`, `r2=1`, `r3=1`; `p1=1`, `p2=2`; Bahu 3 and Lajur 1 1.

## T7-C1 — one-event SPM/SLA evaluation

The scope is PEKBANG, Bangkinang gate, shift 1, 2026-06-01. The gate is ID 33. One monitoring report is in scope. Its four booth means are 4, 5, 6.004, and 9 seconds. Booth 3 has raw durations 6 and 6.008 seconds; the exact mean is 6.004. The displayed mean rounds to 6.00, but comparisons use the unrounded mean.

The effective PEKBANG thresholds use `<=` and apply to both SPM and SLA: code 1 = 6s, code 2 = 5s, code 3 = 9s, code 4 = 4s, code 5 = 5s. Compare each booth mean with each threshold. Equality passes. For example, booth 3 fails codes 1, 2, 4, and 5 because 6.004 exceeds each threshold; it passes code 3. Booth 4 at 9 seconds passes code 3 at its threshold and fails the other four.

## T9-C2 — two-period SPM/SLA comparison

The scope is PEKBANG. Period A is 2026-01-05 through 2026-01-10; period B is 2026-01-12 through 2026-01-17. Each period has two reports and four booths per report, for eight evaluations per code. The booth means are 3.5 seconds four times and 4.5 seconds four times in period A; they are 5.5 seconds four times and 6.5 seconds four times in period B.

The current effective PEKBANG thresholds are the same for SPM and SLA, and all five SLA rules apply: code 1 = 6s, code 2 = 5s, code 3 = 9s, code 4 = 4s, and code 5 = 5s. A period fails when any evaluation fails.

| Code | Limit | Period A failures | Period A status | Period B failures | Period B status |
|---|---:|---:|---|---:|---|
| kecepatan-transaksi-1 | 6s | 0 of 8 | pass | 4 of 8 | fail |
| kecepatan-transaksi-2 | 5s | 0 of 8 | pass | 8 of 8 | fail |
| kecepatan-transaksi-3 | 9s | 0 of 8 | pass | 0 of 8 | pass |
| kecepatan-transaksi-4 | 4s | 4 of 8 | fail | 8 of 8 | fail |
| kecepatan-transaksi-5 | 5s | 0 of 8 | pass | 8 of 8 | fail |

SPM and SLA counts and transitions are calculated separately even though these current limits are equal. The exact JSON, including both transition fields, is in the case and run records.
