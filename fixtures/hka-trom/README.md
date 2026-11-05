# HKA TROM combined fixtures

The 15 cases are loaded into `gamingmachine:hkatrom_bi.public`. The simple runner has the test set **HKA TROM — combined fixture v1**, ID `33286160-5a84-5e7a-99e7-cda9e8ca1edc`, in its configured `carta` database. Open Settings → Test sets to run it. Model runs have not been started.

There are 237 inserted rows, including one synthetic support employee. Existing application rows and master/configuration values were preserved. The old database on `ciddeploy` was only read. No app code or runner comparison code was changed.

## Case revisions

| Case | Section | Previous window | New window |
|---|---|---|---|
| T2-C1 | PEKBANG | March 1–7, 2026 | March 1–7, 2030 |
| T5-C1 | PEKBANG | April 2026 | April 2030 |
| T7-C2 | BINSTA | June 2, 2026 | June 2, 2030 |
| T1-C2 | BINSTA | January 25–30, 2026 | January 25–30, 2030 |

The other 11 windows are unchanged. Each moved case also moves its support and exclusion rows by four years. IDs were assigned per case in the range 1600100001–1601500000; the shared employee ID is 1600000001. `id-map.json` contains every mapping. Expected output dates and IDs follow those mappings.

Three supplementary cases had private SLA threshold overrides in the old snapshots. The new cases use the app's existing rules:

| Case | Rule | Old SLA threshold | Current SLA threshold |
|---|---|---:|---:|
| T7-C4 | kecepatan-transaksi-1 | 5 | 6 |
| T8-C2 | kecepatan-transaksi-3 | 8 | 9 |
| T9-C2 | kecepatan-transaksi-1 | 5 | 6 |

Their expected compliance results were recalculated. In particular, the old stricter-SLA distinction in T7-C4 is no longer present. These are revised cases, not exact reproductions of the old configuration experiment. The other 12 answers match the historical answers after date/ID replacement.

Prompts contain the output schema, calculation and ordering conventions, and the actual table names. The runner still uses its existing exact JSON comparison. Prompts contain no expected values or synthetic-ID filters.

## Verify

From this directory:

```sh
python3 migrate.py verify
```

This reads the current database. It verifies all fixture rows and recalculates all 15 expected answers from the combined data and current master/configuration rows. It includes operational rows in the relevant years, including non-fixture rows, so new matching data can cause verification to fail.

`calculate.py` uses rational arithmetic before rounding. Before loading, it reproduced all 15 archived expected answers using their original snapshots and rules. The load was first run in a transaction that rolled back. The committed load checked row content, all case answers, foreign keys, unique constraints, and hashes of pre-existing rows. Final verification was repeated against committed data. Evidence is in `historical-verification.json`, `verification.json`, `live-verification.json`, and `configuration-changes.json`. Compressed source captures and before/after evidence are under `evidence/`.

## Reload or remove

```sh
python3 migrate.py check
python3 migrate.py load
python3 import_runner.py
```

`check` inserts inside a transaction and rolls it back. `load` inserts missing fixture IDs, verifies existing fixture IDs, and does not overwrite rows. The importer creates the dedicated set and verifies its saved cases; it does not replace other sets or start a run. `prepare` rebuilds the fixture artifacts from the retained source capture and historical files under the old thesis repository; it is not needed for normal verification or running cases.

To remove the database fixture rows, first run verification, then inspect and execute `remove-fixtures.sql` against the same `hkatrom_bi` target. It deletes only the recorded fixture IDs and rejects unexpected foreign-key references. It does not delete the saved test set or run history. Removal has not been executed.
