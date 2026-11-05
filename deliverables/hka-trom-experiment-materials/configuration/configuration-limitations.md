# Configuration evidence limits

The run record does not save a model ID, provider, model settings, or a copy of global Agent instructions. The selected chat histories identify the answering model as Muse Spark 1.3 and show its Cloudflare profile ID. A Cloudflare OS configuration read on 2026-11-01 found one configured model: provider `ollama`, context window 1,048,576, output limit 131,072, and `reasoning: null`. The provider endpoint address and credential values are withheld. This is a retrieval-time snapshot, not a saved per-run snapshot. The API did not return temperature or top-p settings.

The global Agent instructions in `agent-instructions.txt` are the content available on 2026-11-01. An earlier 2026-10-29 admin inspection recorded no global instruction text and no context collection. Later update records show instruction lengths and hashes but do not preserve the full text. The current context collection contains seven documents and reports `lastUpdated` as 2026-10-29 19:00:29.063Z, during the latest run's stored time window. Chat 62 (T9-C2) records reads from this collection. The exact global instructions active for every case cannot be established from the run records.

Use the context documents and current model snapshot as available configuration evidence. Do not state that they were active for all 15 cases.
