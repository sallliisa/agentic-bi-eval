# HKA TROM final run exports

Retrieved: 2026-11-04T19:57:33.037Z

This package contains the four requested FINAL runs from Carta. Each run has 15 saved cases and 3 repetitions: 45 result rows per run and 180 rows in total. All four runs have status completed.

| Run | PASS / results | FAIL | Execution errors | Export |
|---|---:|---:|---:|---|
| With Skills & Context - Muse Spark 1.3 - FINAL | 45/45 | 0 | 0 | [JSON](runs/00fc2064-b38b-40f4-afb1-e739c853adc7.json) |
| With Skills & Context - DeepSeek v4 - FINAL | 44/45 | 1 | 0 | [JSON](runs/91d09b19-6bda-4149-892a-351879c1c4c8.json) |
| Without Skills & Context - Muse Spark 1.3 - FINAL | 42/45 | 3 | 0 | [JSON](runs/d3f70d6e-2cb0-43b9-8a64-6f67328ccfa8.json) |
| Without Skills & Context - DeepSeek v4 - FINAL | 44/45 | 1 | 0 | [JSON](runs/0579fadf-0d14-4c49-917c-88829c7874e0.json) |

The JSON format follows the run exports in ../hka-trom-experiment-materials/runs/. It adds runName, modelId, repetitions, retrievedAt, and each result's repetition number. Each result retains its saved prompt, raw expected answer, raw actual response, stored verdict, error, chat reference, and timestamps. Parsed JSON values are supplied beside the raw strings. Invalid JSON has a null parsed value and a false IsJson flag. caseId is the Tn-Cn label extracted from the saved case name; resultRowId is the saved result UUID.

Summary FAIL counts include all stored FAIL verdicts. Execution errors are counted separately and can overlap FAIL. Verdicts are exported as saved; they are not recalculated. Timestamps without time zones are preserved as database text. retrievedAt is the UTC retrieval time.

The source queries ran in one read-only, repeatable-read transaction. These are the currently saved result snapshots; prior retry attempts are not stored separately. The With/Without Skills & Context names are saved labels. This package does not independently verify execution-time configuration or include remote chat histories, configuration, or database fixtures. The earlier experiment package stays unchanged. No credentials, provider endpoints, workspace IDs, or user account identifiers are included.

See runs/run-inventory.json for metadata and manifest.json for file sizes and SHA-256 hashes.
