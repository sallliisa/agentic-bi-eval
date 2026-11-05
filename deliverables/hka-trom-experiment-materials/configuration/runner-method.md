# Runner and comparison method

The Carta runner saves a snapshot of each case prompt and expected result when it starts a run. It orders cases by saved position, then case ID. It creates a new Cloudflare OS chat for each case and submits the saved prompt as the first user message. The runner selects the first model returned for the workspace. It stores the chat ID, final response, verdict, error, and per-case start and finish timestamps.

The runner parses both JSON values. It compares primitive values exactly, compares arrays in order, and compares object fields without requiring the same key order. If the expected value is not valid JSON, it falls back to trimmed text equality. The run result file preserves both raw strings and parsed values when parsing succeeds.

A retry clears and overwrites the existing result row. The Carta database has no attempt-history table. A matching prompt in another Cloudflare OS chat is not proof that the chat was a retry unless a saved run result links to it.

The current test set does not store a dataset revision and does not check whether source rows changed. The operator treats the data as frozen. The runner compares only the actual response with the saved expected result.

The Carta run timestamps are stored in columns without a time zone. The runner source writes `toISOString()` values. This package preserves the exact database text and does not convert it. Cloudflare chat timestamps retain their original `Z` suffix.
