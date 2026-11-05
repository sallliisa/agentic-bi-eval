# Controlled data provenance

The controlled rows come from `fixtures/hka-trom/rows.json`. The fixture contains 237 rows across 15 source tables. The rows were loaded into `hkatrom_bi.public`; the source records remain in the same schema as the business data. There are no case-specific data schemas.

The fixture load record reports 237 inserted rows and unchanged pre-existing rows. A live read-only verification on 2026-11-01 checked the fixture rows and recalculated all 15 expected answers against the current records and configuration. The verification result is `live-fixture-verification.json`.

The full historical source capture and the broad after-load database snapshot were excluded. They include data outside the 15 case scopes. The packaged row set contains only controlled fixture records, and the configuration file contains only the required section, gate, shift, class, cause, asset, and SPM/SLA values.
