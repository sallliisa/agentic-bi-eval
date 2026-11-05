# Missing and unrecorded evidence

## Three-run, 45-result claim

The request describes three executions of 15 cases (45 results), all PASS. The connected Carta database does not contain those records. It contains one run of the current 15-case set: `e3353347-8ac0-4ca0-b5d6-b46ac78dac13`, with 15 PASS results. Do not report 45/45 or invent two more runs.

The database also contains two older 11-case runs. Run `fa5bb126-55d8-4413-aa07-7d43b6d50852` has 11 FAIL results. Run `ec5191cf-a2a2-439e-8e26-f40ade7bd3c4` failed with `'openGadget' is not a function.` and has 11 failed result rows. A separate one-case run is included for completeness but does not belong to the current set. See `runs/run-inventory.json`.

## Retries

Carta stores one current result row per case. The retry implementation clears and replaces that row. It does not keep previous attempts. Chats 49 and 61 have initial prompts that match T8-C1 and T9-C2, but no Carta result row links to them. The package labels them as unlinked matching chats. Their status as retries is unverified.

## Runtime configuration

The run rows do not preserve the model, provider, inference settings, global instructions, or the context documents active for each case. Chat authors identify Muse Spark 1.3. `configuration/current-cloudflare-config.json` and `configuration/agent-instructions.txt` are snapshots retrieved on 2026-11-01, not per-run records. Context metadata says the collection was updated during the latest run. Temperature and top-p were not returned. Do not state that the retrieval-time configuration was active for all cases.

## Histories and external materials

Full histories are included for the six requested worked cases, plus two unlinked prompt matches. The other nine linked chat histories were not included. Their Carta result snapshots and chat references are present in the run JSON.

The thesis directory search found no friend-thesis PDF or DOCX. Three older Markdown notes are included in `legacy/`, clearly marked as historical.

## Time zone

Carta run timestamps are stored without a time zone. The runner wrote UTC ISO strings, but the database columns do not retain a zone marker. The package preserves the stored strings and does not apply a time zone conversion.
