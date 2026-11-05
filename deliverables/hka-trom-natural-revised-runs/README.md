# HKA TROM NATURAL-REVISED run exports

Retrieved: 2026-11-05T05:29:13.010Z

This package contains the four completed NATURAL-REVISED runs for test set `ebb5c42f-0a27-458a-a970-7d8c95a679ff` (HKA TROM — Natural business requests). Each run has 15 cases and 3 repetitions: 45 result rows per run, 180 total.

| Run | PASS / results | FAIL | Execution errors | Export |
|---|---:|---:|---:|---|
| Muse Spark 1.3 NATURAL-REVISED; WITHOUT business context | 41/45 | 4 | 0 | [JSON](runs/914c3235-4f10-442c-943e-5590caf4940a.json) |
| DeepSeek v4 NATURAL-REVISED; WITHOUT business context | 39/45 | 6 | 0 | [JSON](runs/fc74c650-4320-4a14-81b9-f290dad69014.json) |
| Muse Spark 1.3 NATURAL-REVISED; WITH business context | 45/45 | 0 | 0 | [JSON](runs/b340097c-be13-40d6-bff0-87e408a11e96.json) |
| DeepSeek v4 NATURAL-REVISED; WITH business context | 45/45 | 0 | 0 | [JSON](runs/ce90d492-d366-45e5-9b42-a968a27b51b1.json) |

Each run file preserves the saved prompt, raw expected answer, raw actual response, stored verdict, error, chat reference, repetition, and timestamps. Parsed JSON values are supplied beside the raw strings. Invalid JSON has a null parsed value and a false IsJson flag. Case IDs are read from the saved case names.

FAIL counts use the currently saved verdicts. Execution errors are counted separately and can overlap FAIL. Verdicts are exported as stored; this export does not recalculate them. Database timestamps are without time zone; exact text from PostgreSQL is preserved.

Two user-authorized rows had their outer Markdown JSON fences removed after the inner JSON was confirmed equal to the expected answer; their saved verdicts are PASS. The refreshed Muse runs are included at their current saved state. Run names are saved labels and do not independently verify execution-time context configuration. This package does not include remote chat histories or prior retry attempts.

The source queries ran in one read-only, repeatable-read transaction. No credentials or provider secrets are included. See `runs/run-inventory.json` for run metadata and `manifest.json` for file sizes and SHA-256 hashes.
