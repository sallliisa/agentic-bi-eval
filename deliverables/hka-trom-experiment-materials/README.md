# HKA TROM experiment materials

This package contains read-only source records for the latest HKA TROM Agentic BI experiment found in Carta and Cloudflare OS. It keeps saved prompts, JSON schemas, expected results, actual responses, case scopes, controlled data, relevant business configuration, and selected execution histories.

## Verified run inventory

The latest saved 15-case run is `e3353347-8ac0-4ca0-b5d6-b46ac78dac13`. It has 15 PASS results. The Carta database does not contain three 15-case runs or 45 results. Two older 11-case runs are included and labeled. One has 11 FAIL results; the other failed during setup. See `missing-evidence.md` before using the results in the thesis.

The test set uses one shared source database, `hkatrom_bi.public`. It does not use case-specific schemas. It has 237 controlled fixture rows across 15 tables. The data package includes the synthetic case rows and only the master/configuration rows needed to interpret those cases. It excludes broad operational snapshots and contact fields.

## Contents

- `cases/current-test-set.json` has all 15 saved case IDs, prompts with embedded JSON Schemas, scopes, and expected JSON values.
- `cases/case-scopes.json` lists normalized date and entity filters for each case.
- `case-design/fixture-design-metadata.json` preserves case construction notes without prior expected-answer values.
- `runs/` has every run and result row found in Carta, with raw and parsed values, verdicts, errors, timestamps, and chat references.
- `database/` has the focused public-schema extract, ERD, controlled fixture rows, filtered current business configuration, and live verification record.
- `calculations/` has a portable calculator, its input data, all calculated results, and worked calculations for the six priority cases.
- `configuration/` has the retrieved Agent instructions, seven context documents, current model profile, and the TROM tool contract.
- `traces/selected/` has full message histories for T1-C2, T2-C1, T4-C1, T6-C1, T7-C1, and T9-C2. Two unlinked chats with matching T8-C1 and T9-C2 prompts are in `traces/unlinked-matching-chats/`. Some unrelated broad tool outputs are redacted; each redaction is listed in `traces/trace-index.json`.
- `legacy/` has three older thesis notes. They are not current experiment evidence.

## Reproduce the calculations

Run `python3 calculations/reproduce.py` from this directory. It uses only the included case definitions, controlled rows, and filtered current master/configuration data. It does not read the expected results.

## Data handling

The retrieval used read-only database queries and Cloudflare OS read-only chat and configuration APIs. The package omits credentials, workspace IDs, provider endpoint addresses, contact fields, and unrelated operational records. A small number of broad tool outputs were replaced with redaction notes; `traces/trace-index.json` lists each redaction.

Timestamps from Carta are preserved as stored. Those columns do not retain time zones. Cloudflare chat timestamps keep their original UTC `Z` marker.

Open `missing-evidence.md` for unrecorded runs, retry-history limits, configuration gaps, and files that were not available.
