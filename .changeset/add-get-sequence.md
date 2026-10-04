---
"@anthonyhagi/kit-node-sdk": minor
---

Add `sequences.get(id, params)` for fetching sequence settings and schedules, with optional `include: "stats"` support. Export `GetSequence`, `GetSequenceParams`, and `SequenceStats`, including nullable deliverability metrics and optional counts. Missing sequences return null through the existing 404 handling.
